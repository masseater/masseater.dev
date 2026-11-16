import { Array, Effect, HashSet, Option, Stream, String, pipe } from "effect";
import { Tar } from "effect/encoding";

import { tarEntries, writeTar } from "./tar-stream.ts";
import type { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

export interface Selection {
  readonly source: string;
  readonly guids: HashSet.HashSet<string>;
}

export interface LooseFile {
  readonly guid: string;
  readonly pathname: string;
  readonly data: Uint8Array;
}

const looseEntries = ({ guid, pathname, data }: LooseFile): readonly Tar.Entry[] => [
  Tar.file(`${guid}/asset`, data),
  Tar.file(`${guid}/asset.meta`, `fileFormatVersion: 2\nguid: ${guid}\n`),
  Tar.file(`${guid}/pathname`, pathname),
];

const guidOf = ({ header }: Tar.Entry<UnityPackageUnreadable>): string =>
  pipe(header.path, String.replace(/^\.\//u, ""), String.split("/"), Array.headNonEmpty);

const selected =
  (guids: HashSet.HashSet<string>) =>
  (entry: Tar.Entry<UnityPackageUnreadable>): boolean =>
    entry.header.type === "File" && HashSet.has(guids, guidOf(entry));

const collect =
  (guids: HashSet.HashSet<string>) =>
  (
    entry: Tar.Entry<UnityPackageUnreadable>,
  ): Effect.Effect<Option.Option<Tar.Entry>, UnityPackageUnreadable> =>
    Option.match(Option.liftPredicate(entry, selected(guids)), {
      onNone: () => Effect.succeedNone,
      onSome: ({ header }) =>
        Effect.map(Stream.mkUint8Array(entry.body), (body) =>
          Option.some(Tar.file(header.path, body)),
        ),
    });

const filesOf = Effect.fn("filesOf")(function* selectedFiles({ source, guids }: Selection) {
  const entries = yield* tarEntries(source);
  const files = yield* entries.pipe(Stream.mapEffect(collect(guids)), Stream.runCollect);
  return Array.getSomes(files);
});

/** @internal */
export const writePackage = Effect.fn("writePackage")(function* writeUnityPackage(
  selections: readonly Selection[],
  loose: readonly LooseFile[],
  destination: string,
) {
  const perSelection = yield* pipe(selections, Effect.forEach(filesOf));
  const files = [...Array.flatten(perSelection), ...pipe(loose, Array.flatMap(looseEntries))];
  yield* writeTar(destination, Stream.fromIterable(files));
});

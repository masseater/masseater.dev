import { Array, Effect, FileSystem, HashSet, Option, Stream, String, pipe } from "effect";
import type { ParsedTarEntry } from "modern-tar";
import { packTar } from "modern-tar";

import { bodyOf, skip, tarEntries } from "./tar-stream.ts";
import { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

interface Selection {
  readonly source: string;
  readonly guids: HashSet.HashSet<string>;
}

interface LooseFile {
  readonly guid: string;
  readonly pathname: string;
  readonly data: Uint8Array;
}

interface TarFile {
  readonly header: ParsedTarEntry["header"];
  readonly body: Uint8Array;
}

const encoder = new TextEncoder();

const tarFile = (name: string, body: Uint8Array): TarFile => ({
  header: { name, size: body.byteLength, type: "file" },
  body,
});

const looseEntries = ({ guid, pathname, data }: LooseFile): readonly TarFile[] => [
  tarFile(`${guid}/asset`, data),
  tarFile(`${guid}/asset.meta`, encoder.encode(`fileFormatVersion: 2\nguid: ${guid}\n`)),
  tarFile(`${guid}/pathname`, encoder.encode(pathname)),
];

const guidOf = ({ header }: ParsedTarEntry): string =>
  pipe(header.name, String.replace(/^\.\//u, ""), String.split("/"), Array.headNonEmpty);

const compress = (tar: Uint8Array): Promise<Uint8Array> =>
  new Response(
    new Blob([Uint8Array.from(tar)]).stream().pipeThrough(new CompressionStream("gzip")),
  ).bytes();

const selected =
  (guids: HashSet.HashSet<string>) =>
  (entry: ParsedTarEntry): boolean =>
    entry.header.type === "file" && HashSet.has(guids, guidOf(entry));

const collect =
  ({ source, guids }: Selection) =>
  (entry: ParsedTarEntry): Effect.Effect<Option.Option<TarFile>, UnityPackageUnreadable> =>
    Option.match(Option.liftPredicate(entry, selected(guids)), {
      onNone: () => Effect.as(skip(entry), Option.none()),
      onSome: ({ header }) =>
        Effect.map(bodyOf(source, entry), (body) => Option.some({ header, body })),
    });

const filesOf = Effect.fn("filesOf")(function* selectedFiles({ source, guids }: Selection) {
  const entries = yield* tarEntries(source);
  const files = yield* entries.pipe(
    Stream.mapEffect(collect({ source, guids })),
    Stream.runCollect,
  );
  return Array.getSomes(files);
});

/** @internal */
const writePackage = Effect.fn("writePackage")(function* writeUnityPackage(
  selections: readonly Selection[],
  loose: readonly LooseFile[],
  destination: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const perSelection = yield* pipe(selections, Effect.forEach(filesOf));
  const files = [...Array.flatten(perSelection), ...pipe(loose, Array.flatMap(looseEntries))];
  const failed = (cause: unknown): UnityPackageUnreadable =>
    UnityPackageUnreadable.make({ path: destination, cause });
  const tar = yield* Effect.tryPromise({ try: () => packTar(files), catch: failed });
  const archive = yield* Effect.tryPromise({ try: () => compress(tar), catch: failed });
  yield* fileSystem.writeFile(destination, archive);
});

export { writePackage };
export type { LooseFile, Selection };

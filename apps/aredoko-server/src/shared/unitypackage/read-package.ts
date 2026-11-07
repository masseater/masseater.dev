import { Array, Effect, Option, Record, Schema, Stream, String, pipe } from "effect";
import type { ParsedTarEntry } from "modern-tar";

import { bodyOf, referencesIn, scanBody, skip, tarEntries } from "./tar-stream.ts";
import type { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

const INLINE_ASSET_BYTES = 2_097_152;
const NO_BYTES = 0;

interface PackageEntry {
  readonly guid: string;
  readonly pathname: string;
  readonly asset: Option.Option<Uint8Array>;
  readonly meta: Option.Option<string>;
  readonly preview: Option.Option<Uint8Array>;
  readonly references: readonly string[];
}

interface RawFile {
  readonly guid: string;
  readonly file: string;
  readonly data: Option.Option<Uint8Array>;
  readonly references: readonly string[];
}

const Guid = Schema.String.check(Schema.isPattern(/^[0-9a-f]{32}$/u));
const isGuid = Schema.is(Guid);

const decoder = new TextDecoder();
const latin1 = new TextDecoder("latin1");

const partsOf = (name: string): readonly string[] =>
  pipe(name, String.replace(/^\.\//u, ""), String.split("/"));

const splitName = ({ header }: ParsedTarEntry): Option.Option<readonly [string, string]> => {
  const [guid = "", file = ""] = partsOf(header.name);
  return Option.liftPredicate(
    [guid, file] as const,
    ([candidate, rest]) => header.type === "file" && isGuid(candidate) && String.isNonEmpty(rest),
  );
};

const isInline = (file: string, entry: ParsedTarEntry): boolean =>
  file !== "asset" || entry.header.size <= INLINE_ASSET_BYTES;

const referencesOfFile = (file: string, bytes: Uint8Array): readonly string[] =>
  Option.match(
    Option.liftPredicate(file, (name) => name !== "preview.png"),
    { onNone: () => [], onSome: () => referencesIn(latin1.decode(bytes)) },
  );

interface Located {
  readonly path: string;
  readonly entry: ParsedTarEntry;
  readonly guid: string;
  readonly file: string;
}

const readInline = Effect.fn("readInline")(function* readInlineFile({
  path,
  entry,
  guid,
  file,
}: Located) {
  const bytes = yield* bodyOf(path, entry);
  return {
    guid,
    file,
    data: Option.some(bytes),
    references: referencesOfFile(file, bytes),
  } satisfies RawFile;
});

const readLarge = Effect.fn("readLarge")(function* readLargeFile({
  path,
  entry,
  guid,
  file,
}: Located) {
  const references = yield* scanBody(path, entry);
  return { guid, file, data: Option.none(), references } satisfies RawFile;
});

const readFile = (located: Located): Effect.Effect<RawFile, UnityPackageUnreadable> =>
  Option.match(
    Option.liftPredicate(located, ({ file, entry }) => isInline(file, entry)),
    { onNone: () => readLarge(located), onSome: readInline },
  );

const readEntry =
  (path: string) =>
  (entry: ParsedTarEntry): Effect.Effect<Option.Option<RawFile>, UnityPackageUnreadable> =>
    Option.match(splitName(entry), {
      onNone: () => Effect.as(skip(entry), Option.none()),
      onSome: ([guid, file]) => Effect.asSome(readFile({ path, entry, guid, file })),
    });

const fileOf =
  (name: string) =>
  (files: readonly RawFile[]): Option.Option<Uint8Array> =>
    pipe(
      files,
      Array.findFirst(({ file }) => file === name),
      Option.flatMap(({ data }) => data),
    );

const firstLine = (bytes: Uint8Array): string =>
  pipe(decoder.decode(bytes), String.split("\n"), Array.headNonEmpty, String.trim);

const referencesOf = (guid: string, files: readonly RawFile[]): readonly string[] =>
  pipe(
    files,
    Array.filter(({ file }) => file === "asset" || file === "asset.meta"),
    Array.flatMap(({ references }) => references),
    Array.filter((reference) => reference !== guid),
    Array.dedupe,
  );

const entryOf = (files: Array.NonEmptyReadonlyArray<RawFile>): Option.Option<PackageEntry> => {
  const [{ guid }] = files;
  return pipe(
    fileOf("pathname")(files),
    Option.map(firstLine),
    Option.filter(String.isNonEmpty),
    Option.map((pathname) => ({
      guid,
      pathname,
      asset: fileOf("asset")(files),
      meta: Option.map(fileOf("asset.meta")(files), (bytes) => decoder.decode(bytes)),
      preview: Option.filter(
        fileOf("preview.png")(files),
        ({ byteLength }) => byteLength > NO_BYTES,
      ),
      references: referencesOf(guid, files),
    })),
  );
};

const entriesOf = (files: readonly Option.Option<RawFile>[]): readonly PackageEntry[] =>
  pipe(
    Array.getSomes(files),
    Array.groupBy(({ guid }) => guid),
    Record.values,
    Array.map(entryOf),
    Array.getSomes,
  );

/** @internal */
const readPackage = Effect.fn("readPackage")(function* readUnityPackage(path: string) {
  const entries = yield* tarEntries(path);
  const files = yield* entries.pipe(Stream.mapEffect(readEntry(path)), Stream.runCollect);
  return entriesOf(files);
});

export { readPackage };
export type { PackageEntry };

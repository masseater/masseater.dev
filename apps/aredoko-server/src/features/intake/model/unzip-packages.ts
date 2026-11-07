import { ZipReader, configure } from "@zip.js/zip.js";
import type { Entry, FileEntry } from "@zip.js/zip.js";
import { Array, Effect, FileSystem, Option, Path, pipe } from "effect";

import { isCompanion, isLoose, isPackage } from "#entities/package";
import { collectBytes } from "#shared/bytes";

import { bundleCount, placedCount } from "./counts.ts";
import { FileReader } from "./file-reader.ts";
import type { ReadRange } from "./file-reader.ts";
import { IntakeFailed } from "./intake-failed.ts";
import { placeFile } from "./place-file.ts";

const LEGACY_ENCODING = "shift_jis";

const EMPTY = new Uint8Array();

configure({ useWebWorkers: false });

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

const legacy = new TextDecoder(LEGACY_ENCODING);

const decodeName = (value: Uint8Array): string => {
  try {
    return strictUtf8.decode(value);
  } catch {
    return legacy.decode(value);
  }
};

const attempt = <Value>(evaluate: () => Promise<Value>): Effect.Effect<Value, IntakeFailed> =>
  Effect.tryPromise({ try: evaluate, catch: (cause) => IntakeFailed.make({ cause }) });

const isPackageEntry = (entry: Entry): entry is FileEntry =>
  !entry.directory && isPackage(entry.filename);

const isAssetEntry = (entry: Entry): entry is FileEntry =>
  !entry.directory && (isLoose(entry.filename) || isCompanion(entry.filename));

type Run = <Value, Failure>(
  effect: Effect.Effect<Value, Failure, FileSystem.FileSystem>,
) => Promise<Value>;

const runner = Effect.gen(function* runner() {
  const context = yield* Effect.context<FileSystem.FileSystem>();
  const run: Run = (effect) => Effect.runPromiseWith(context)(effect);
  return run;
});

const writeEntry = Effect.fn("writeEntry")(function* writeEntryTo(
  entry: FileEntry,
  partial: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const run = yield* runner;
  yield* fileSystem.writeFile(partial, EMPTY);
  const writable = new WritableStream<Uint8Array>({
    write: (chunk): Promise<void> => run(fileSystem.writeFile(partial, chunk, { flag: "a" })),
  });
  yield* attempt(() => entry.getData(writable));
});

const readRange = Effect.fn("readRange")(function* readRange(
  zip: string,
  offset: number,
  bytesToRead: number,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* collectBytes(fileSystem.stream(zip, { offset, bytesToRead }));
});

const rangeOf =
  (run: Run, zip: string): ReadRange =>
  (index, length) =>
    run(readRange(zip, index, length));

const placeEntry = Effect.fn("placeEntry")(function* placeEntry(folder: string, entry: FileEntry) {
  const path = yield* Path.Path;
  return yield* placeFile({
    folder: pipe(
      Option.liftPredicate(folder, () => isPackage(entry.filename)),
      Option.getOrElse(() => path.join(folder, path.dirname(entry.filename))),
    ),
    name: path.basename(entry.filename),
    size: entry.uncompressedSize,
    write: (partial) => writeEntry(entry, partial),
  });
});

const openZip = Effect.fn("openZip")(function* openZip(zip: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const run = yield* runner;
  const { size } = yield* fileSystem.stat(zip);
  const reader = new ZipReader(new FileReader(rangeOf(run, zip), Number(size)));
  yield* Effect.addFinalizer(() =>
    pipe(
      attempt(() => reader.close()),
      Effect.ignore,
    ),
  );
  return reader;
});

/** @internal */
const unzipPackages = Effect.fn("unzipPackages")(function* unzipPackagesInto(
  zip: string,
  library: string,
) {
  const path = yield* Path.Path;
  const folder = path.join(library, path.parse(zip).name);
  const reader = yield* openZip(zip);
  const entries = yield* attempt(() =>
    reader.getEntries({ decodeText: (value) => decodeName(value) }),
  );
  const packages = yield* pipe(
    entries,
    Array.filter(isPackageEntry),
    Effect.forEach((entry) => placeEntry(folder, entry)),
  );
  const assets = yield* pipe(
    entries,
    Array.filter(isAssetEntry),
    Effect.forEach((entry) => placeEntry(folder, entry)),
  );
  return placedCount(packages) + bundleCount(assets);
}, Effect.scoped);

export { unzipPackages };

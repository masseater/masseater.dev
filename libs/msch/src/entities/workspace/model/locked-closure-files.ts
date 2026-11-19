import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { CLOSURE_FILE, FINGERPRINT_FILE, LOCK_FILE } from "#/shared/lib/locked-closure-paths.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { lockedClosures } from "./locked-closures.ts";
import type { LockedClosure } from "./locked-closures.ts";
import { manifestLines, manifestsFingerprint } from "./locked-manifests.ts";

const LINE = "\n";
const FILE_CONCURRENCY = 16;
const FORMAT = "packages-and-manifests";

const writeChanged = Effect.fn("writeChanged")(function* writeChanged(file: string, text: string) {
  const files = yield* RepositoryFiles;
  const written = yield* files.readFile(file);
  if (!Option.exists(written, (found) => found === text)) {
    yield* files.writeFile(file, text);
  }
});

const fingerprintOf = Effect.fn("fingerprintOf")(function* fingerprintOf(
  root: string,
  lock: string,
  importers: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* manifestsFingerprint(root, importers);
  return yield* files.hash(Arr.join([FORMAT, lock, manifests], LINE));
});

const isWritten = Effect.fn("isWritten")(function* isWritten(root: string, lock: string) {
  const files = yield* RepositoryFiles;
  const recorded = yield* files.readFile(files.join(root, FINGERPRINT_FILE));
  const [hash, ...importers] = Str.split(
    Option.getOrElse(recorded, () => ""),
    LINE,
  );
  const fingerprint = yield* fingerprintOf(root, lock, importers);
  if (hash !== fingerprint) {
    return false;
  }
  const present = yield* Effect.forEach(
    importers,
    (importer) => files.exists(files.join(root, importer, CLOSURE_FILE)),
    { concurrency: FILE_CONCURRENCY },
  );
  return pipe(present, Arr.every(Boolean));
});

const writeClosure = Effect.fn("writeClosure")(function* writeClosure(
  root: string,
  [importer, closure]: readonly [string, LockedClosure],
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* manifestLines(root, importer, closure);
  yield* writeChanged(
    files.join(root, importer, CLOSURE_FILE),
    Arr.join([...closure.packages, ...manifests], LINE),
  );
});

const writeAll = Effect.fn("writeAll")(function* writeAll(root: string, lock: string) {
  const files = yield* RepositoryFiles;
  const closures = yield* lockedClosures(root);
  const entries = Rec.toEntries(Option.getOrElse(closures, () => ({})));
  yield* Effect.forEach(entries, (entry) => writeClosure(root, entry), {
    concurrency: FILE_CONCURRENCY,
    discard: true,
  });
  const importers = pipe(
    entries,
    Arr.map(([importer]) => importer),
  );
  const fingerprint = yield* fingerprintOf(root, lock, importers);
  yield* files.writeFile(
    files.join(root, FINGERPRINT_FILE),
    Arr.join([fingerprint, ...importers], LINE),
  );
});

/** @internal */
export const writeLockedClosures = Effect.fn("writeLockedClosures")(function* writeLockedClosures(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const lock = yield* files.hashFile(files.join(root, LOCK_FILE));
  if (Option.isNone(lock)) {
    return;
  }
  const written = yield* isWritten(root, lock.value);
  if (!written) {
    yield* writeAll(root, lock.value);
  }
});

import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { CLOSURE_FILE, FINGERPRINT_FILE, LOCK_FILE } from "#/shared/lib/locked-closure-paths.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { lockedClosures } from "./locked-closures.ts";

const LINE = "\n";
const FILE_CONCURRENCY = 16;

const writeChanged = Effect.fn("writeChanged")(function* writeChanged(file: string, text: string) {
  const files = yield* RepositoryFiles;
  const written = yield* files.readFile(file);
  if (!Option.exists(written, (found) => found === text)) {
    yield* files.writeFile(file, text);
  }
});

const isWritten = Effect.fn("isWritten")(function* isWritten(root: string, fingerprint: string) {
  const files = yield* RepositoryFiles;
  const recorded = yield* files.readFile(files.join(root, FINGERPRINT_FILE));
  const [hash, ...importers] = Str.split(
    Option.getOrElse(recorded, () => ""),
    LINE,
  );
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

const writeAll = Effect.fn("writeAll")(function* writeAll(root: string, fingerprint: string) {
  const files = yield* RepositoryFiles;
  const closures = yield* lockedClosures(root);
  const entries = Rec.toEntries(Option.getOrElse(closures, () => ({})));
  yield* Effect.forEach(
    entries,
    ([importer, closure]) =>
      writeChanged(files.join(root, importer, CLOSURE_FILE), Arr.join(closure, LINE)),
    { concurrency: FILE_CONCURRENCY, discard: true },
  );
  const importers = pipe(
    entries,
    Arr.map(([importer]) => importer),
  );
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
  const fingerprint = yield* files.hashFile(files.join(root, LOCK_FILE));
  if (Option.isNone(fingerprint)) {
    return;
  }
  const written = yield* isWritten(root, fingerprint.value);
  if (!written) {
    yield* writeAll(root, fingerprint.value);
  }
});

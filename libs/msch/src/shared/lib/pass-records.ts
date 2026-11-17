import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "./repository-files.ts";

const PASSED = "";
const UNREADABLE = "";
const FIELD_SEPARATOR = "\0";
const LINE_SEPARATOR = "\n";

export interface Records {
  readonly directory: string;
  readonly passed: readonly string[];
}

export type NamedFile = readonly [name: string, file: string];

export const contentKey = Effect.fn("contentKey")(function* contentKey(
  salt: readonly string[],
  named: readonly NamedFile[],
) {
  const files = yield* RepositoryFiles;
  const entries = yield* Effect.forEach(
    named,
    ([name, file]) =>
      files
        .hashFile(file)
        .pipe(
          Effect.map(
            (found) => `${name}${FIELD_SEPARATOR}${Option.getOrElse(found, () => UNREADABLE)}`,
          ),
        ),
    { concurrency: 1 },
  );
  return yield* files.hash(Arr.join([...salt, ...entries], LINE_SEPARATOR));
});

export const recordsIn = Effect.fn("recordsIn")(function* recordsIn(directory: string) {
  const files = yield* RepositoryFiles;
  const present = yield* files.readDirectory(directory);
  return { directory, passed: present } satisfies Records;
});

export const keepOnly = Effect.fn("keepOnly")(function* keepOnly(
  records: Records,
  keys: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const stale = pipe(
    records.passed,
    Arr.filter((key) => !Arr.contains(keys, key)),
  );
  yield* Effect.forEach(stale, (key) => files.removeFile(files.join(records.directory, key)), {
    concurrency: 1,
    discard: true,
  });
  yield* Effect.forEach(
    keys,
    (key) => files.writeFile(files.join(records.directory, key), PASSED),
    { concurrency: 1, discard: true },
  );
});

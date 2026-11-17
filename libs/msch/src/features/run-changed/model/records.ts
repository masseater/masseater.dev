import { Array as Arr, Effect, pipe } from "effect";

import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RECORDS = [NODE_MODULES, ".cache", "msch", "changed"] as const;
const ARGUMENT_SEPARATOR = "\0";
const PASSED = "";

export interface Records {
  readonly directory: string;
  readonly passed: readonly string[];
}

export const recordsOf = Effect.fn("recordsOf")(function* recordsOf(
  root: string,
  command: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const name = yield* files.hash(Arr.join(command, ARGUMENT_SEPARATOR));
  const directory = files.join(root, ...RECORDS, name);
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

import { Array as Arr, Effect } from "effect";

import { recordsIn } from "#/shared/lib/pass-records.ts";
import { NODE_MODULES, RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RECORDS = [NODE_MODULES, ".cache", "msch", "changed"] as const;
const ARGUMENT_SEPARATOR = "\0";

export const recordsOf = Effect.fn("recordsOf")(function* recordsOf(
  root: string,
  command: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const name = yield* files.hash(Arr.join(command, ARGUMENT_SEPARATOR));
  return yield* recordsIn(files.join(root, ...RECORDS, name));
});

import { Array as Arr, Effect, Option } from "effect";

import {
  cratesIn,
  hasVerifyTask,
  owningWorkspace,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { Crate } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "unverified-crate";
const CARGO_FILE = "Cargo.toml";
const CONFIG_FILE = "vite.config.ts";
const FIRST = 1;
const READ_CONCURRENCY = 8;

const problemFor = (crate: Crate, message: string): Problem => ({
  file: crate.manifest,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message: `crate ${crate.name} ${message}, so vp run verify never checks it.`,
});

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  directories: readonly string[],
  crate: Crate,
) {
  const files = yield* RepositoryFiles;
  const workspace = owningWorkspace(directories)(
    files.relative(root, files.dirname(crate.manifest)),
  );
  if (Option.isNone(workspace)) {
    return Option.some(problemFor(crate, "is outside every workspace package"));
  }
  const verified = yield* hasVerifyTask(files.join(root, workspace.value, CONFIG_FILE));
  if (verified) {
    return Option.none<Problem>();
  }
  return Option.some(
    problemFor(crate, `is in ${workspace.value}, whose ${CONFIG_FILE} has no verify task`),
  );
});

/** @internal */
export const checkCrates = Effect.fn("checkCrates")(function* checkCrates(root: string) {
  const files = yield* RepositoryFiles;
  const cargo = yield* files.exists(files.join(root, CARGO_FILE));
  if (!cargo) {
    return [];
  }
  const directories = yield* workspaceDirectories(root);
  const crates = yield* cratesIn(root);
  const found = yield* Effect.forEach(crates, (crate) => problemIn(root, directories, crate), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

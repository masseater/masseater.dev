import { Array as Arr, Effect, Option } from "effect";

import {
  workspaceConfigOf,
  workspaceDirectories,
  VERIFY_TASK,
  definesTask,
  hasVerifyTask,
} from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";

const RULE: RuleName = "hidden-verify";
const CONFIG_FILE = "vite.config.ts";
const FIRST = 1;
const READ_CONCURRENCY = 8;

const problemIn = Effect.fn("problemIn")(function* problemIn(root: string, directory: string) {
  const config = yield* workspaceConfigOf(root, directory);
  if (Option.isNone(config)) {
    return Option.none<Problem>();
  }
  const { file, program } = config.value;
  if (definesTask(VERIFY_TASK)(program)) {
    return Option.none<Problem>();
  }
  const verified = yield* hasVerifyTask(file);
  return Option.some<Problem>({
    file,
    line: FIRST,
    column: FIRST,
    rule: RULE,
    message: `${directory} gets its verify task from code outside ${CONFIG_FILE}. The root verify reads ${CONFIG_FILE} without running it, so it never runs this verify. Write run.tasks.verify in ${directory}/${CONFIG_FILE}.`,
  }).pipe(Option.filter(() => verified));
});

/** @internal */
export const checkHiddenVerify = Effect.fn("checkHiddenVerify")(function* checkHiddenVerify(
  root: string,
) {
  const directories = yield* workspaceDirectories(root);
  const found = yield* Effect.forEach(directories, (directory) => problemIn(root, directory), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

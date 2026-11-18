import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import {
  keyName,
  literalOf,
  propertyValue,
  runTasksOf,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { RunTask, RunTasks } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "unlocked-task";
const READ_CONCURRENCY = 8;
const READS_DEPENDENCIES = /^vp (?:test|pack|build)\b/u;

const decodeCommand = Schema.decodeUnknownOption(
  Schema.Union([Schema.String, Schema.NonEmptyArray(Schema.String)]),
);

const commandOf = (task: RunTask): Option.Option<string> =>
  pipe(
    propertyValue("command")(task.value),
    Option.getOrElse(() => task.value),
    literalOf,
    Option.flatMap(decodeCommand),
    Option.flatMap((command) =>
      Arr.findFirst(Arr.ensure(command), (line) => READS_DEPENDENCIES.test(line)),
    ),
  );

const tracksLockfiles = (task: RunTask): boolean =>
  pipe(
    propertyValue("cache")(task.value),
    Option.flatMap(literalOf),
    Option.match({
      onNone: () => Option.isNone(propertyValue("cache")(task.value)),
      onSome: (cache) => cache !== false,
    }),
  );

const problemsOf = ({ file, source, tasks }: RunTasks): readonly Problem[] =>
  pipe(
    tasks,
    Arr.filter(tracksLockfiles),
    Arr.flatMap((task) =>
      pipe(
        commandOf(task),
        Option.map((command): Problem => ({
          file,
          ...positionOf(source)(task.start),
          rule: RULE,
          message: `The task ${keyName(task.key)} runs ${command} with inputs written by hand. It then reruns after every lockfile change, and it does not rerun when a dependency of a dependency moves. Set cache to LOCKED from @r_masseater/msch/locked-inputs.`,
        })),
        Option.toArray,
      ),
    ),
  );

/** @internal */
export const checkUnlockedTasks = Effect.fn("checkUnlockedTasks")(function* checkUnlockedTasks(
  root: string,
) {
  const directories = yield* workspaceDirectories(root);
  const found = yield* Effect.forEach(directories, (directory) => runTasksOf(root, directory), {
    concurrency: READ_CONCURRENCY,
  });
  return pipe(Arr.getSomes(found), Arr.flatMap(problemsOf));
});

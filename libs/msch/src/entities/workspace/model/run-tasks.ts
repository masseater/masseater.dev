import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { KeySchema, nestedValues } from "./config-literal.ts";
import { workspaceConfigOf } from "./workspace-config-source.ts";
import { RUN_TASKS } from "./workspace-tasks.ts";

const TaskProperty = Schema.Struct({
  type: Schema.Literal("Property"),
  computed: Schema.Literal(false),
  key: KeySchema,
  value: Schema.Unknown,
  start: Schema.Finite,
});
const TaskObject = Schema.Struct({
  type: Schema.Literal("ObjectExpression"),
  properties: Schema.Array(Schema.Unknown),
});

const decodeTaskProperty = Schema.decodeUnknownOption(TaskProperty);
const decodeTaskObject = Schema.decodeUnknownOption(TaskObject);

export type RunTask = typeof TaskProperty.Type;

interface RunTasks {
  readonly file: string;
  readonly source: string;
  readonly tasks: readonly RunTask[];
}

const tasksIn = (program: unknown): readonly RunTask[] =>
  pipe(
    nestedValues(RUN_TASKS)(program),
    Arr.flatMap((tasks) =>
      pipe(
        decodeTaskObject(tasks),
        Option.map(({ properties }) => properties),
        Option.getOrElse((): readonly unknown[] => []),
      ),
    ),
    Arr.flatMap((property) => Option.toArray(decodeTaskProperty(property))),
  );

export const runTasksOf = Effect.fn("runTasksOf")(function* runTasksOf(
  root: string,
  directory: string,
) {
  const config = yield* workspaceConfigOf(root, directory);
  return pipe(
    config,
    Option.map(({ file, source, program }): RunTasks => ({
      file,
      source,
      tasks: tasksIn(program),
    })),
  );
});

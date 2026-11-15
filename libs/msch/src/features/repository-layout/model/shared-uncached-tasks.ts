import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import {
  KeySchema,
  keyName,
  literalOf,
  nestedValues,
  RUN_TASKS,
  workspaceConfigOf,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "shared-uncached-task";
const READ_CONCURRENCY = 8;
const SHARED = 2;
const OWN_PROGRAM = /^(?:node|vpx|bun|deno|tsx)$|\//u;

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
const UncachedTask = Schema.Struct({
  cache: Schema.Literal(false),
  command: Schema.Union([Schema.String, Schema.NonEmptyArray(Schema.String)]),
});

const decodeTaskProperty = Schema.decodeUnknownOption(TaskProperty);
const decodeTaskObject = Schema.decodeUnknownOption(TaskObject);
const decodeUncachedTask = Schema.decodeUnknownOption(UncachedTask);
const encodeDefinition = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

interface UncachedDefinition {
  readonly directory: string;
  readonly file: string;
  readonly position: Pick<Problem, "line" | "column">;
  readonly name: string;
  readonly command: string;
  readonly definition: string;
}

const commandText = (command: typeof UncachedTask.Type.command): string =>
  Arr.join(Arr.ensure(command), " && ");

const runsOwnProgram = (command: string): boolean =>
  pipe(
    Str.trim(command),
    Str.split(/\s+/u),
    Arr.head,
    Option.exists((program) => OWN_PROGRAM.test(program)),
  );

interface ConfigFile {
  readonly directory: string;
  readonly file: string;
  readonly source: string;
}

const definitionOf =
  ({ directory, file, source }: ConfigFile) =>
  (task: typeof TaskProperty.Type): Option.Option<UncachedDefinition> =>
    Option.gen(function* uncachedDefinition() {
      const literal = yield* literalOf(task.value);
      const { command } = yield* decodeUncachedTask(literal);
      const text = commandText(command);
      if (runsOwnProgram(text)) {
        return yield* Option.none();
      }
      const definition = yield* encodeDefinition(literal);
      return {
        directory,
        file,
        position: positionOf(source)(task.start),
        name: keyName(task.key),
        command: text,
        definition,
      };
    });

const definitionsIn = Effect.fn("definitionsIn")(function* definitionsIn(
  root: string,
  directory: string,
) {
  const config = yield* workspaceConfigOf(root, directory);
  if (Option.isNone(config)) {
    return [];
  }
  const { file, source, program } = config.value;
  return pipe(
    nestedValues(RUN_TASKS)(program),
    Arr.flatMap((tasks) =>
      pipe(
        decodeTaskObject(tasks),
        Option.map(({ properties }) => properties),
        Option.getOrElse((): readonly unknown[] => []),
      ),
    ),
    Arr.flatMap((property) =>
      pipe(
        decodeTaskProperty(property),
        Option.flatMap(definitionOf({ directory, file, source })),
        Option.toArray,
      ),
    ),
  );
});

const problemsOf = (definitions: readonly UncachedDefinition[]): readonly Problem[] => {
  const directories = pipe(
    definitions,
    Arr.map(({ directory }) => directory),
    Arr.dedupe,
  );
  if (directories.length < SHARED) {
    return [];
  }
  return pipe(
    definitions,
    Arr.map(({ file, position, name, command }): Problem => ({
      file,
      ...position,
      rule: RULE,
      message: `The uncached task ${name} (${command}) is written the same way in ${Arr.join(directories, ", ")}. Write it once in a shared helper and spread it into each run.tasks, so that a change to it reaches every workspace.`,
    })),
  );
};

/** @internal */
export const checkSharedUncachedTasks = Effect.fn("checkSharedUncachedTasks")(
  function* checkSharedUncachedTasks(root: string) {
    const directories = yield* workspaceDirectories(root);
    const found = yield* Effect.forEach(
      directories,
      (directory) => definitionsIn(root, directory),
      { concurrency: READ_CONCURRENCY },
    );
    return pipe(
      Arr.flatten(found),
      Arr.groupBy(({ name, definition }) => `${name}\u0000${definition}`),
      Rec.values,
      Arr.flatMap(problemsOf),
    );
  },
);

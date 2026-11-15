import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import {
  childrenOf,
  keyName,
  literalOf,
  propertyValue,
  runTasksOf,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { RunTask } from "#/entities/workspace/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { runScriptsOf } from "#/shared/lib/workflow-run.ts";

const ROOT_DIRECTORY = ".";
const COMMAND_KEY = "command";
const ARGUMENTS_KEY = "args";
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const MANIFESTS: readonly string[] = [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED];
const STEP_FILES: readonly string[] = [
  ":(glob).github/workflows/*.yml",
  ":(glob).github/workflows/*.yaml",
  ":(glob)**/action.yml",
  ":(glob)**/action.yaml",
  ...EXCLUDED,
];
const HOOK_FILES: readonly string[] = [":(glob).vite-hooks/*"];
const AGENT_FILES: readonly string[] = [".claude/settings.json", ".mcp.json"];
const READ_CONCURRENCY = 16;
const START = 0;
const FIRST = 1;
const LINE = "\n";

export type CommandKind = "script" | "task" | "step" | "hook" | "agent";

export interface CommandSource {
  readonly kind: CommandKind;
  readonly file: string;
  readonly position: Pick<Problem, "line" | "column">;
  readonly name: string;
  readonly text: string;
}

const CommandText = Schema.Union([Schema.String, Schema.Array(Schema.String)]);
const decodeCommandText = Schema.decodeUnknownOption(CommandText);
const Scripts = Schema.Struct({
  scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const decodeScripts = Schema.decodeUnknownOption(Schema.fromJsonString(Scripts));
const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const decodeArguments = Schema.decodeUnknownOption(Schema.Array(Schema.String));

const NO_SOURCES: readonly CommandSource[] = [];

const offsetOf = (source: string, text: string): number =>
  pipe(
    Str.indexOf(text)(source),
    Option.getOrElse(() => START),
  );

const scriptSources =
  (file: string) =>
  (source: string): readonly CommandSource[] =>
    pipe(
      decodeScripts(source),
      Option.flatMap(({ scripts }) => Option.fromUndefinedOr(scripts)),
      Option.map(Rec.toEntries),
      Option.getOrElse((): readonly (readonly [string, string])[] => []),
      Arr.map(([name, text]): CommandSource => {
        const offset = offsetOf(source, `"${name}"`);
        return { kind: "script", file, position: positionOf(source)(offset), name, text };
      }),
    );

const stepSources =
  (file: string) =>
  (source: string): readonly CommandSource[] =>
    pipe(
      runScriptsOf(source),
      Arr.map(({ text, start }): CommandSource => ({
        kind: "step",
        file,
        position: positionOf(source)(start),
        name: "run",
        text,
      })),
    );

const hookSources =
  (file: string, name: string) =>
  (source: string): readonly CommandSource[] =>
    pipe(
      Str.split(source, LINE),
      Arr.map((text, index): CommandSource => ({
        kind: "hook",
        file,
        position: { line: index + FIRST, column: FIRST },
        name,
        text,
      })),
    );

const commandIn = (node: unknown): Option.Option<string> => {
  if (!Predicate.isReadonlyObject(node)) {
    return Option.none();
  }
  const record: Readonly<Record<string, unknown>> = node;
  return pipe(
    Option.fromUndefinedOr(record[COMMAND_KEY]),
    Option.filter(Predicate.isString),
    Option.map((command) =>
      pipe(
        decodeArguments(record[ARGUMENTS_KEY]),
        Option.getOrElse((): readonly string[] => []),
        Arr.prepend(command),
        Arr.join(" "),
      ),
    ),
  );
};

const commandsIn = (node: unknown): readonly string[] => [
  ...Option.toArray(commandIn(node)),
  ...pipe(childrenOf(node), Arr.flatMap(commandsIn)),
];

const agentSources =
  (file: string) =>
  (source: string): readonly CommandSource[] =>
    pipe(
      decodeJson(source),
      Option.map(commandsIn),
      Option.getOrElse((): readonly string[] => []),
      Arr.map((text): CommandSource => {
        const program = Arr.headNonEmpty(Str.split(text, " "));
        const offset = offsetOf(source, `"${program}"`);
        return {
          kind: "agent",
          file,
          position: positionOf(source)(offset),
          name: COMMAND_KEY,
          text,
        };
      }),
    );

const taskCommand = (value: unknown): Option.Option<string> =>
  pipe(
    propertyValue(COMMAND_KEY)(value),
    Option.orElse(() => Option.some(value)),
    Option.flatMap(literalOf),
    Option.flatMap(decodeCommandText),
    Option.map((command) => Arr.join(Arr.ensure(command), LINE)),
  );

const taskSource =
  (file: string, source: string) =>
  (task: RunTask): Option.Option<CommandSource> =>
    pipe(
      taskCommand(task.value),
      Option.map((text) => ({
        kind: "task",
        file,
        position: positionOf(source)(task.start),
        name: keyName(task.key),
        text,
      })),
    );

const taskSources = Effect.fn("taskSources")(function* taskSources(
  root: string,
  directory: string,
) {
  const found = yield* runTasksOf(root, directory);
  if (Option.isNone(found)) {
    return NO_SOURCES;
  }
  const { file, source, tasks } = found.value;
  return pipe(
    tasks,
    Arr.flatMap((task) => Option.toArray(taskSource(file, source)(task))),
  );
});

const workspaceTasks = Effect.fn("workspaceTasks")(function* workspaceTasks(
  root: string,
  directories: readonly string[],
) {
  const found = yield* Effect.forEach(directories, (directory) => taskSources(root, directory), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.flatten(found);
});

const readSources = Effect.fn("readSources")(function* readSources(
  root: string,
  names: readonly string[],
  sourcesOf: (file: string, name: string) => (source: string) => readonly CommandSource[],
) {
  const files = yield* RepositoryFiles;
  const found = yield* Effect.forEach(
    names,
    (name) => {
      const file = files.join(root, name);
      const sourcesIn = Option.match({ onNone: () => NO_SOURCES, onSome: sourcesOf(file, name) });
      return files.readFile(file).pipe(Effect.map(sourcesIn));
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});

/** @internal */
export const commandSources = Effect.fn("commandSources")(function* commandSources(root: string) {
  const files = yield* RepositoryFiles;
  const [manifests, steps, hooks, workspaces] = yield* Effect.all(
    [
      files.matchingFiles(root, MANIFESTS),
      files.matchingFiles(root, STEP_FILES),
      files.matchingFiles(root, HOOK_FILES),
      workspaceDirectories(root),
    ],
    { concurrency: "unbounded" },
  );
  const found = yield* Effect.all(
    [
      readSources(root, manifests, scriptSources),
      readSources(root, steps, stepSources),
      readSources(root, hooks, hookSources),
      readSources(root, AGENT_FILES, agentSources),
      workspaceTasks(root, Arr.dedupe([ROOT_DIRECTORY, ...workspaces])),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

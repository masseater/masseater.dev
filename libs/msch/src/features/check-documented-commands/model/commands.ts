import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { GivenTaskGraph, listedTasks } from "./task-graph.ts";
import type { TaskGraph } from "./task-graph.ts";

const RULE: RuleName = "documented-commands";
const DOCUMENTS = ["*AGENTS.md", "*CLAUDE.md"];
const DOCUMENT_NAMES: ReadonlySet<string> = new Set(["AGENTS.md", "CLAUDE.md"]);
const COMMAND = /`vp run (?<args>[^`]+)`/gu;
const COMMAND_START = "`vp run ";
const ARGS = "args";
const PLACEHOLDER = /[<>*{}$]/u;
const WHITESPACE = /\s+/u;
const ROOT = ".";
const SEPARATOR = "/";
const END_OF_OPTIONS = "--";
const FLAG = "-";
const TASK_SEPARATOR = "#";
const LOCAL_PREFIX = "./";
const FILTER_FLAGS: ReadonlySet<string> = new Set(["--filter", "-F"]);
const FILTER_ASSIGNMENT = "--filter=";
const RECURSIVE_FLAGS: ReadonlySet<string> = new Set(["-r", "--recursive"]);
const ROOT_FLAGS: ReadonlySet<string> = new Set(["-w", "--workspace-root"]);
const ONE = 1;
const START = 0;

type Scope =
  | { readonly kind: "here" }
  | { readonly kind: "root" }
  | { readonly kind: "anywhere" }
  | { readonly kind: "package"; readonly name: string };

interface Invocation {
  readonly task: string;
  readonly scope: Scope;
}

interface Document {
  readonly file: string;
  readonly text: string;
}

const optionsOf = (args: string): readonly string[] =>
  pipe(
    Str.split(Str.trim(args), WHITESPACE),
    Arr.takeWhile((token) => token !== END_OF_OPTIONS),
  );

const isFilterFlag = (token: string): boolean => FILTER_FLAGS.has(token);

const isPlaceholder = (token: string): boolean => PLACEHOLDER.test(token);

const filterOf = (tokens: readonly string[]): Option.Option<string> =>
  pipe(
    tokens,
    Arr.findFirstIndex(isFilterFlag),
    Option.flatMap((index) => Arr.get(tokens, index + ONE)),
    Option.orElse(() =>
      pipe(
        tokens,
        Arr.findFirst(Str.startsWith(FILTER_ASSIGNMENT)),
        Option.map(Str.slice(FILTER_ASSIGNMENT.length)),
      ),
    ),
  );

const follows =
  (tokens: readonly string[]) =>
  (index: number): boolean =>
    pipe(Arr.get(tokens, index - ONE), Option.exists(isFilterFlag));

const specifierOf = (tokens: readonly string[]): Option.Option<string> =>
  pipe(
    tokens,
    Arr.findFirstIndex((token, index) => !Str.startsWith(FLAG)(token) && !follows(tokens)(index)),
    Option.flatMap((index) => Arr.get(tokens, index)),
  );

const hasAny =
  (flags: ReadonlySet<string>) =>
  (tokens: readonly string[]): boolean =>
    pipe(
      tokens,
      Arr.some((token) => flags.has(token)),
    );

const scopeOf = (tokens: readonly string[]): Scope => {
  const filter = filterOf(tokens);
  if (Option.isSome(filter)) {
    return { kind: "package", name: filter.value };
  }
  if (hasAny(RECURSIVE_FLAGS)(tokens)) {
    return { kind: "anywhere" };
  }
  if (hasAny(ROOT_FLAGS)(tokens)) {
    return { kind: "root" };
  }
  return { kind: "here" };
};

const invocationOf =
  (tokens: readonly string[]) =>
  (specifier: string): Invocation => {
    const [owner, ...rest] = Str.split(specifier, TASK_SEPARATOR);
    return pipe(
      Arr.head(rest),
      Option.match({
        onNone: (): Invocation => ({ task: specifier, scope: scopeOf(tokens) }),
        onSome: (task): Invocation => ({ task, scope: { kind: "package", name: owner } }),
      }),
    );
  };

const parsed = (args: string): Option.Option<Invocation> => {
  const tokens = optionsOf(args);
  return pipe(
    specifierOf(tokens),
    Option.filter(() => !pipe(tokens, Arr.some(isPlaceholder))),
    Option.map(invocationOf(tokens)),
  );
};

const ancestorsOf = (file: string): readonly string[] => {
  const parts = pipe(Str.split(file, SEPARATOR), Arr.dropRight(ONE));
  return [
    ...Arr.makeBy(parts.length, (index) =>
      pipe(parts, Arr.take(parts.length - index), Arr.join(SEPARATOR)),
    ),
    ROOT,
  ];
};

const named =
  (graph: TaskGraph, name: string) =>
  (directory: string): boolean =>
    directory === Str.replace(LOCAL_PREFIX, "")(name) ||
    pipe(
      Rec.get(graph.packages, directory),
      Option.exists((found) => found.name === name),
    );

const packagesOf =
  (graph: TaskGraph, file: string) =>
  (scope: Scope): readonly string[] => {
    const directories = Rec.keys(graph.packages);
    if (scope.kind === "anywhere") {
      return directories;
    }
    if (scope.kind === "root") {
      return [ROOT];
    }
    if (scope.kind === "package") {
      return pipe(directories, Arr.filter(named(graph, scope.name)));
    }
    return pipe(
      ancestorsOf(file),
      Arr.findFirst((directory) => Rec.has(graph.packages, directory)),
      Option.toArray,
    );
  };

const hasTask =
  (graph: TaskGraph, task: string) =>
  (directory: string): boolean =>
    pipe(
      Rec.values(graph.tasks),
      Arr.some((found) => found.package === directory && found.name === task),
    );

const whereOf = (scope: Scope, file: string): string => {
  if (scope.kind === "anywhere") {
    return "any package";
  }
  if (scope.kind === "root") {
    return "the workspace root";
  }
  if (scope.kind === "package") {
    return `package ${scope.name}`;
  }
  return `the package that holds ${file}`;
};

const isMissing =
  (graph: TaskGraph, file: string) =>
  ({ task, scope }: Invocation): boolean =>
    !pipe(packagesOf(graph, file)(scope), Arr.some(hasTask(graph, task)));

const problemsIn = (
  graph: TaskGraph,
  absolute: (file: string) => string,
  { file, text }: Document,
): readonly Problem[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(COMMAND)(text)),
    Arr.flatMap((match) =>
      pipe(
        Option.fromNullishOr(match.groups),
        Option.flatMap(Rec.get(ARGS)),
        Option.flatMap(parsed),
        Option.filter(isMissing(graph, file)),
        Option.map(({ task, scope }): Problem => ({
          file: absolute(file),
          ...positionOf(text)(match.index ?? START),
          rule: RULE,
          message: `${match[START]} runs task ${task}, but ${whereOf(scope, file)} has no such task. Fix the command or the task`,
        })),
        Option.toArray,
      ),
    ),
  );

const isDocument = (file: string): boolean =>
  pipe(
    Str.split(file, SEPARATOR),
    Arr.last,
    Option.exists((name) => DOCUMENT_NAMES.has(name)),
  );

/** @internal */
export const checkDocumentedCommands = Effect.fn("checkDocumentedCommands")(
  function* checkDocumentedCommands(root: string) {
    const files = yield* RepositoryFiles;
    const listed = yield* files.trackedFiles(root, DOCUMENTS);
    const documents = yield* Effect.forEach(
      pipe(listed, Arr.filter(isDocument)),
      (file) =>
        files
          .readFile(files.join(root, file))
          .pipe(Effect.map(Option.map((text): Document => ({ file, text })))),
      { concurrency: "unbounded" },
    );
    const commanded = pipe(
      Arr.getSomes(documents),
      Arr.filter(({ text }) => Str.includes(COMMAND_START)(text)),
    );
    if (!Arr.isReadonlyArrayNonEmpty(commanded)) {
      return [];
    }
    const given = yield* GivenTaskGraph;
    const graph = yield* Option.match(given, {
      onNone: () => listedTasks(root),
      onSome: Effect.succeedSome,
    });
    const absolute = (file: string): string => files.join(root, file);
    return Option.match(graph, {
      onNone: (): readonly Problem[] => [
        {
          file: absolute(Arr.headNonEmpty(commanded).file),
          line: ONE,
          column: ONE,
          rule: RULE,
          message: "msch could not list the tasks with `vp run --json`",
        },
      ],
      onSome: (found) =>
        pipe(
          commanded,
          Arr.flatMap((document) => problemsIn(found, absolute, document)),
        ),
    });
  },
);

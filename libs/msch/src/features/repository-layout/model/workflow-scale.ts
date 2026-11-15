import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { isMap, isPair, parseDocument } from "yaml";

import { namedWorkspaces } from "#/entities/workspace/index.ts";
import type { NamedWorkspace } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { childOf, entriesOf, scalarsIn, stringOf } from "./workflow-nodes.ts";
import type { Located } from "./workflow-nodes.ts";
import { workflowReferences } from "./workflow-references.ts";

const PATH_FILTER: RuleName = "workflow-path-filter";
const PACKAGE: RuleName = "workflow-package";
const WORKFLOW = /^\.github\/workflows\/(?<name>[^/]+)\.ya?ml$/u;
const ACTION = /^\.github\/actions\/(?<name>[^/]+)\/action\.ya?ml$/u;
const FILTER_KEYS: readonly string[] = ["paths", "paths-ignore"];
const PATHS_FILTER_ACTION = /(?:^|\/)paths-filter@/u;
const PACKAGE_FILTER =
  /(?:^|\s)(?:--filter|-F)(?:\s+|=)(?<quote>["']?)(?<value>[^\s"'$][^\s"']*)\k<quote>/gu;
const START = 0;
const READ_CONCURRENCY = 8;
const SEPARATOR = "/";
const WORD_SEPARATORS = /[-_]/gu;
const SPACE = " ";

const FILTER_MESSAGE =
  "A workflow that reacts to changes under listed paths needs a new entry for every package and drifts from the packages it is meant to cover. Run the generic pipeline on every push and let it decide from the workspace what changed.";

const packageMessage = (what: string, directory: string): string =>
  `${what} names the workspace ${directory}. A workflow or job made for one package does not scale: give the package a vp task and let the generic pipeline (verify, deploy, release, daily, task) find it.`;

const keysOf = (node: unknown): readonly Located[] =>
  pipe(
    Option.liftPredicate(node, isMap),
    Option.map((map): readonly unknown[] => map.items),
    Option.getOrElse((): readonly unknown[] => []),
    Arr.filter(isPair),
    Arr.flatMap(({ key }) => Option.toArray(stringOf(key))),
  );

type Where = Readonly<{ file: string; source: string }>;

const problemAt =
  ({ file, source }: Where, rule: RuleName, message: string) =>
  (offset: number): Problem => ({
    file,
    ...positionOf(source)(offset),
    rule,
    message,
  });

const pathFiltersIn = (file: string, source: string): readonly Problem[] => {
  const root = parseDocument(source).contents;
  const triggers = pipe(
    entriesOf(childOf("on")(root)),
    Arr.flatMap(([, trigger]) => keysOf(trigger)),
    Arr.filter(({ text }) => Arr.contains(FILTER_KEYS, text)),
  );
  const actions = pipe(
    scalarsIn(source),
    Arr.filter(({ text }) => PATHS_FILTER_ACTION.test(text)),
  );
  return pipe(
    [...triggers, ...actions],
    Arr.map(({ offset }) => problemAt({ file, source }, PATH_FILTER, FILTER_MESSAGE)(offset)),
  );
};

const matching = (workspaces: readonly NamedWorkspace[], text: string): Option.Option<string> =>
  pipe(
    workspaces,
    Arr.findFirst(({ pattern }) => Option.isSome(Str.match(pattern)(text))),
    Option.map(({ directory }) => directory),
  );

const named = (workspaces: readonly NamedWorkspace[], text: string): Option.Option<string> =>
  Option.orElse(matching(workspaces, text), () =>
    matching(workspaces, Str.replaceAll(WORD_SEPARATORS, SPACE)(text)),
  );

const containing = (workspaces: readonly NamedWorkspace[], path: string): Option.Option<string> =>
  pipe(
    workspaces,
    Arr.findFirst(
      ({ directory }) => path === directory || Str.startsWith(`${directory}${SEPARATOR}`)(path),
    ),
    Option.map(({ directory }) => directory),
  );

const namesIn = (name: string, source: string): readonly Located[] => {
  const root = parseDocument(source).contents;
  return [
    { text: name, offset: START },
    ...Option.toArray(stringOf(childOf("name")(root))),
    ...keysOf(childOf("jobs")(root)),
  ];
};

const filtersIn = (source: string): readonly Located[] =>
  pipe(
    scalarsIn(source),
    Arr.flatMap(({ text, offset }) =>
      pipe(
        Arr.fromIterable(Str.matchAll(PACKAGE_FILTER)(text)),
        Arr.flatMap((match) =>
          pipe(
            Option.fromNullishOr(match.groups),
            Option.flatMap((groups) => Option.fromNullishOr(groups["value"])),
            Option.toArray,
          ),
        ),
        Arr.map((value) => ({ text: value, offset })),
      ),
    ),
  );

const packagesIn = (
  workspaces: readonly NamedWorkspace[],
  { file, name, source }: Readonly<{ file: string; name: string; source: string }>,
): readonly Problem[] => {
  const fromNames = pipe(
    namesIn(name, source),
    Arr.flatMap(({ text, offset }) =>
      pipe(
        named(workspaces, text),
        Option.map((directory) =>
          problemAt({ file, source }, PACKAGE, packageMessage(`"${text}"`, directory))(offset),
        ),
        Option.toArray,
      ),
    ),
  );
  const referenced = pipe(
    workflowReferences(source),
    Arr.filter(({ field }) => !Str.startsWith("on.")(field)),
    Arr.flatMap(({ field, path, offset }) =>
      pipe(
        containing(workspaces, path),
        Option.map((directory) =>
          problemAt({ file, source }, PACKAGE, packageMessage(field, directory))(offset),
        ),
        Option.toArray,
      ),
    ),
  );
  const filtered = pipe(
    filtersIn(source),
    Arr.flatMap(({ text, offset }) =>
      pipe(
        matching(workspaces, text),
        Option.map((directory) =>
          problemAt(
            { file, source },
            PACKAGE,
            packageMessage(`--filter ${text}`, directory),
          )(offset),
        ),
        Option.toArray,
      ),
    ),
  );
  return [...fromNames, ...referenced, ...filtered];
};

const actionProblems = (
  workspaces: readonly NamedWorkspace[],
  file: string,
  name: string,
): readonly Problem[] =>
  pipe(
    named(workspaces, name),
    Option.map((directory): Problem => ({
      file,
      line: 1,
      column: 1,
      rule: PACKAGE,
      message: packageMessage(`The action ${name}`, directory),
    })),
    Option.toArray,
  );

const groupOf = (pattern: RegExp, name: string): Option.Option<string> =>
  pipe(
    Str.match(pattern)(name),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap((groups) => Option.fromNullishOr(groups["name"])),
  );

/** @internal */
export const checkWorkflowScale = Effect.fn("checkWorkflowScale")(function* checkWorkflowScale(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const workspaces = yield* namedWorkspaces(root);
  const workflows = pipe(
    listed,
    Arr.flatMap((name) =>
      pipe(
        groupOf(WORKFLOW, name),
        Option.map((stem) => ({ name, stem })),
        Option.toArray,
      ),
    ),
  );
  const found = yield* Effect.forEach(
    workflows,
    ({ name, stem }) =>
      Effect.gen(function* problemsOf() {
        const file = files.join(root, name);
        const source = yield* files.readFile(file);
        return pipe(
          source,
          Option.map((text) => [
            ...pathFiltersIn(file, text),
            ...packagesIn(workspaces, { file, name: stem, source: text }),
          ]),
          Option.getOrElse((): readonly Problem[] => []),
        );
      }),
    { concurrency: READ_CONCURRENCY },
  );
  const actions = pipe(
    listed,
    Arr.flatMap((name) =>
      pipe(
        groupOf(ACTION, name),
        Option.map((action) => actionProblems(workspaces, files.join(root, name), action)),
        Option.getOrElse((): readonly Problem[] => []),
      ),
    ),
  );
  return [...Arr.flatten(found), ...actions];
});

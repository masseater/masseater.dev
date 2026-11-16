import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { namedWorkspaces, patternOf } from "#/entities/workspace/index.ts";
import type { NamedWorkspace } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "root-readme";
const ROOT_DOC = /^(?:README(?:\.[^/]+)?|AGENTS\.md|CLAUDE\.md)$/iu;
const READ_CONCURRENCY = 16;
const START = 0;
const CHECK_POLICY = "@r_masseater/msch";
const MARKETPLACE = ".claude-plugin/marketplace.json";
const RELATIVE = /^\.\//u;
const SEPARATOR = "/";
const MarketplacePlugin = Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Schema.Unknown,
});
const Marketplace = Schema.fromJsonString(
  Schema.Struct({ plugins: Schema.Array(MarketplacePlugin) }),
);

interface Plugins {
  readonly directories: readonly string[];
  readonly names: readonly string[];
}

const NO_PLUGINS: Plugins = { directories: [], names: [] };

const isCheckPolicy = ({ packageName }: NamedWorkspace): boolean =>
  Option.contains(packageName, CHECK_POLICY);

const messageFor = (directory: string): string =>
  `names the workspace ${directory}. The root README, AGENTS.md and CLAUDE.md describe the repository as a whole. Write what belongs to the workspace in ${directory}/README.md, or for agents in ${directory}/AGENTS.md.`;

const lastSegment = (directory: string): string =>
  pipe(
    Str.split(SEPARATOR)(directory),
    Arr.last,
    Option.getOrElse(() => directory),
  );

const pluginsOf = (plugins: readonly (typeof MarketplacePlugin.Type)[]): Plugins => {
  const directories = pipe(
    plugins,
    Arr.map(({ source }) => source),
    Arr.filter(Predicate.isString),
    Arr.map(Str.replace(RELATIVE, "")),
  );
  const segments = pipe(directories, Arr.map(lastSegment));
  const names = pipe(
    plugins,
    Arr.map(({ name }) => name),
    Arr.filter(Predicate.isString),
    Arr.appendAll(segments),
    Arr.dedupe,
  );
  return { directories, names };
};

const marketplacePlugins = Effect.fn("marketplacePlugins")(function* marketplacePlugins(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, MARKETPLACE));
  return pipe(
    text,
    Option.flatMap(Schema.decodeOption(Marketplace)),
    Option.map(({ plugins }) => pluginsOf(plugins)),
    Option.getOrElse(() => NO_PLUGINS),
  );
});

const isPluginName =
  (plugins: Plugins) =>
  (name: string): boolean =>
    Arr.contains(plugins.names, name);

const ownNames = (plugins: Plugins, names: readonly string[]): readonly string[] => {
  const ownName = Predicate.not(isPluginName(plugins));
  return pipe(names, Arr.filter(ownName));
};

const patternFor =
  (plugins: Plugins) =>
  ({ directory, names }: NamedWorkspace): RegExp =>
    patternOf(
      Option.match(
        Arr.findFirst(plugins.directories, (plugin) => plugin === directory),
        {
          onNone: () => ownNames(plugins, names),
          onSome: () => [directory],
        },
      ),
    );

const problemsIn =
  (file: string, source: string, plugins: Plugins) =>
  (workspace: NamedWorkspace): readonly Problem[] => {
    const message = messageFor(workspace.directory);
    const at = positionOf(source);
    const pattern = patternFor(plugins)(workspace);
    return pipe(
      Arr.fromIterable(Str.matchAll(pattern)(source)),
      Arr.map((found) => ({ file, ...at(found.index ?? START), rule: RULE, message })),
    );
  };

const problemsInReadme = Effect.fn("problemsInReadme")(function* problemsInReadme(
  file: string,
  workspaces: readonly NamedWorkspace[],
  plugins: Plugins,
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.match({
      onNone: (): readonly Problem[] => [],
      onSome: (source) => pipe(workspaces, Arr.flatMap(problemsIn(file, source, plugins))),
    }),
  );
});

/** @internal */
export const checkRootReadme = Effect.fn("checkRootReadme")(function* checkRootReadme(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const readmes = pipe(
    names,
    Arr.filter((name) => ROOT_DOC.test(name)),
  );
  const named = yield* namedWorkspaces(root);
  const workspaces = pipe(
    named,
    Arr.filter((workspace) => !isCheckPolicy(workspace)),
  );
  const plugins = yield* marketplacePlugins(root);
  const found = yield* Effect.forEach(
    readmes,
    (name) => problemsInReadme(files.join(root, name), workspaces, plugins),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});

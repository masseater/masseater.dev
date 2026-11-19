import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "plugin-marketplace";
const PLUGIN_DIRECTORY = ".claude-plugin";
const PLUGIN_FILE = `${PLUGIN_DIRECTORY}/plugin.json`;
const MARKETPLACE_FILE = `${PLUGIN_DIRECTORY}/marketplace.json`;
const INDENT = 2;

const OwnerSchema = Schema.Struct({ name: Schema.String, url: Schema.optionalKey(Schema.String) });
const Person = Schema.Union([Schema.String, OwnerSchema]);
const RootManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, author: Schema.optionalKey(Person) }),
);
const PluginManifest = Schema.fromJsonString(Schema.Struct({ name: Schema.String }));
const NpmSource = Schema.Struct({ source: Schema.Literal("npm"), package: Schema.String });
const PluginSchema = Schema.Struct({
  name: Schema.String,
  source: Schema.Union([Schema.String, NpmSource]),
  description: Schema.String,
});
const Marketplace = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, owner: OwnerSchema, plugins: Schema.Array(PluginSchema) }),
  { space: INDENT },
);

const decodeRoot = Schema.decodeUnknownOption(RootManifest);
const decodePlugin = Schema.decodeUnknownOption(PluginManifest);
const encodeMarketplace = Schema.encodeEffect(Marketplace);

type Plugin = typeof PluginSchema.Type;
type Owner = typeof OwnerSchema.Type;

const marketplaceName = (packageName: string): string =>
  pipe(
    Str.toLowerCase(packageName),
    Str.replace(/^@/u, ""),
    Str.replaceAll(/[^a-z0-9]+/gu, "-"),
    Str.replaceAll(/^-+|-+$/gu, ""),
  );

const ownerOf = (author: typeof Person.Type): Owner => {
  if (Predicate.isString(author)) {
    return { name: author };
  }
  return author;
};

const sourceOf = (project: WorkspaceProject): Plugin["source"] =>
  pipe(
    project.packageName,
    Option.filter(() => project.published),
    Option.match({
      onNone: (): Plugin["source"] => `./${project.directory}`,
      onSome: (name): Plugin["source"] => ({ source: "npm", package: name }),
    }),
  );

const pluginIn = Effect.fn("pluginIn")(function* pluginIn(root: string, project: WorkspaceProject) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, project.directory, PLUGIN_FILE));
  return pipe(
    text,
    Option.flatMap(decodePlugin),
    Option.map(({ name }): Plugin => ({
      name,
      source: sourceOf(project),
      description: Option.getOrElse(project.description, () => ""),
    })),
  );
});

const problem = problemInFile(RULE);

const pluginsIn = Effect.fn("pluginsIn")(function* pluginsIn(root: string) {
  const projects = yield* workspaceProjects(root);
  const found = yield* Effect.forEach(projects, (project) => pluginIn(root, project), {
    concurrency: "unbounded",
  });
  return Arr.getSomes(found);
});

const ownerIn = Effect.fn("ownerIn")(function* ownerIn(root: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, MANIFEST_FILE));
  return pipe(
    text,
    Option.flatMap(decodeRoot),
    Option.flatMap(({ name, author }) =>
      pipe(
        Option.fromUndefinedOr(author),
        Option.map((found) => ({ name: marketplaceName(name), owner: ownerOf(found) })),
      ),
    ),
  );
});

const rewrite = Effect.fn("rewrite")(function* rewrite(file: string, expected: string) {
  const files = yield* RepositoryFiles;
  const written = yield* files.readFile(file);
  if (Option.exists(written, (text) => text === expected)) {
    return [];
  }
  yield* files.writeFile(file, expected);
  return [
    problem(
      file,
      `${MARKETPLACE_FILE} is generated from the workspaces that have ${PLUGIN_FILE}. msch rewrote it; commit the result.`,
    ),
  ];
});

const withoutPlugins = Effect.fn("withoutPlugins")(function* withoutPlugins(file: string) {
  const files = yield* RepositoryFiles;
  const present = yield* files.exists(file);
  if (!present) {
    return [];
  }
  return [problem(file, `No workspace has ${PLUGIN_FILE}. Delete ${MARKETPLACE_FILE}.`)];
});

/** @internal */
export const checkPluginMarketplace = Effect.fn("checkPluginMarketplace")(
  function* checkPluginMarketplace(root: string) {
    const files = yield* RepositoryFiles;
    const file = files.join(root, MARKETPLACE_FILE);
    const plugins = yield* pluginsIn(root);
    if (!Arr.isReadonlyArrayNonEmpty(plugins)) {
      return yield* withoutPlugins(file);
    }
    const header = yield* ownerIn(root);
    if (Option.isNone(header)) {
      return [
        problem(
          files.join(root, MANIFEST_FILE),
          `Workspaces ship Claude Code plugins, so ${MARKETPLACE_FILE} lists them. Add "author" to the root ${MANIFEST_FILE}; it becomes the marketplace owner.`,
        ),
      ];
    }
    const text = yield* encodeMarketplace({ ...header.value, plugins });
    return yield* rewrite(file, `${text}\n`);
  },
);

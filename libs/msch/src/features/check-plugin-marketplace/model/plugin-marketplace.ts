import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "plugin-marketplace";
const PLUGIN_DIRECTORY = ".claude-plugin";
const PLUGIN_FILE = `${PLUGIN_DIRECTORY}/plugin.json`;
const MARKETPLACE_FILE = `${PLUGIN_DIRECTORY}/marketplace.json`;
const FIRST = 1;
const INDENT = 2;

const Person = Schema.Union([
  Schema.String,
  Schema.Struct({ name: Schema.String, url: Schema.optional(Schema.String) }),
]);
const RootManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, author: Schema.optional(Person) }),
);
const PluginManifest = Schema.fromJsonString(Schema.Struct({ name: Schema.String }));

const decodeRoot = Schema.decodeUnknownOption(RootManifest);
const decodePlugin = Schema.decodeUnknownOption(PluginManifest);

interface Plugin {
  readonly name: string;
  readonly source: string | { readonly source: "npm"; readonly package: string };
  readonly description: string;
}

const marketplaceName = (packageName: string): string =>
  pipe(
    Str.toLowerCase(packageName),
    Str.replace(/^@/u, ""),
    Str.replaceAll(/[^a-z0-9]+/gu, "-"),
    Str.replace(/^-+|-+$/gu, ""),
  );

const ownerOf = (author: typeof Person.Type): { readonly name: string; readonly url?: string } =>
  Str.isString(author) ? { name: author } : author;

const sourceOf = (project: WorkspaceProject): Plugin["source"] =>
  pipe(
    project.packageName,
    Option.filter(() => project.published),
    Option.match({
      onNone: () => `./${project.directory}`,
      onSome: (name) => ({ source: "npm", package: name }),
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

const problem = (file: string, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message,
});

/** @internal */
export const checkPluginMarketplace = Effect.fn("checkPluginMarketplace")(
  function* checkPluginMarketplace(root: string) {
    const files = yield* RepositoryFiles;
    const projects = yield* workspaceProjects(root);
    const found = yield* Effect.forEach(projects, (project) => pluginIn(root, project), {
      concurrency: "unbounded",
    });
    const plugins = Arr.getSomes(found);
    const file = files.join(root, MARKETPLACE_FILE);
    const written = yield* files.readFile(file);
    if (!Arr.isReadonlyArrayNonEmpty(plugins)) {
      return Option.isSome(written)
        ? [problem(file, `No workspace has ${PLUGIN_FILE}. Delete ${MARKETPLACE_FILE}.`)]
        : [];
    }
    const rootFile = files.join(root, MANIFEST_FILE);
    const own = pipe(yield* files.readFile(rootFile), Option.flatMap(decodeRoot));
    if (Option.isNone(own) || own.value.author === undefined) {
      return [
        problem(
          rootFile,
          `Workspaces ship Claude Code plugins, so ${MARKETPLACE_FILE} lists them. Add "author" to the root ${MANIFEST_FILE}; it becomes the marketplace owner.`,
        ),
      ];
    }
    const expected = `${JSON.stringify(
      {
        name: marketplaceName(own.value.name),
        owner: ownerOf(own.value.author),
        plugins,
      },
      undefined,
      INDENT,
    )}\n`;
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
  },
);

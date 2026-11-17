import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { workspaceManifest } from "#/entities/workspace/index.ts";
import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "package-registry";
const REGISTRY = "https://npm.flatt.tech/";
const TRAILING_SLASH = /\/$/u;
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const NPMRC = /(?:^|\/)\.npmrc$/u;
const WORKSPACE_REGISTRY = /^registry:/mu;
const NPMRC_REGISTRY = /^[ \t]*registry[ \t]*=[ \t]*(?<value>\S*)/gmu;
const START = 0;
const REASON = `Installs go through Takumi Guard (${REGISTRY}), which blocks known-malicious packages before they are installed.`;

const decodeRegistry = Schema.decodeUnknownOption(
  Schema.Struct({ registry: Schema.optional(Schema.String) }),
);

const registryOf = (manifest: unknown): Option.Option<string> =>
  pipe(
    decodeRegistry(manifest),
    Option.flatMap(({ registry }) => Option.fromUndefinedOr(registry)),
  );

const withoutSlash = Str.replace(TRAILING_SLASH, "");

const isGuarded = (registry: string): boolean => withoutSlash(registry) === withoutSlash(REGISTRY);

const offsetIn = (found: RegExpExecArray | null): number =>
  pipe(
    Option.fromNullishOr(found),
    Option.map(({ index }) => index),
    Option.getOrElse(() => START),
  );

const workspaceProblem = (
  file: string,
  source: string,
  registry: Option.Option<string>,
): Problem => ({
  file,
  ...positionOf(source)(offsetIn(WORKSPACE_REGISTRY.exec(source))),
  rule: RULE,
  message: Option.match(registry, {
    onNone: () => `${REASON} Set \`registry: ${REGISTRY}\` in ${WORKSPACE_FILE}.`,
    onSome: (value) => `${REASON} \`registry\` is ${value}. Set it to ${REGISTRY}.`,
  }),
});

const npmrcProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(NPMRC_REGISTRY)(source)),
    Arr.filter((found) => !Option.exists(groupOf("value")(found), isGuarded)),
    Arr.map((found) => ({
      file: entry.file,
      ...positionOf(source)(found.index ?? START),
      rule: RULE,
      message: `${REASON} This .npmrc overrides it with \`${Str.trim(found[START])}\`. Remove the line.`,
    })),
  );

const checkWorkspace = Effect.fn("checkWorkspace")(function* checkWorkspace(root: string) {
  const files = yield* RepositoryFiles;
  const manifest = yield* workspaceManifest(root);
  if (Option.isNone(manifest) || Option.exists(registryOf(manifest.value), isGuarded)) {
    return [];
  }
  const registry = registryOf(manifest.value);
  const file = files.join(root, WORKSPACE_FILE);
  const read = yield* files.readFile(file);
  const source = Option.getOrElse(read, () => "");
  return [workspaceProblem(file, source, registry)];
});

/** @internal */
export const checkPackageRegistry = Effect.fn("checkPackageRegistry")(
  function* checkPackageRegistry(root: string) {
    const listed = yield* listedFiles(root);
    const overrides = yield* scanText(
      pipe(
        listed,
        Arr.filter(({ name }) => NPMRC.test(name)),
      ),
      npmrcProblems,
    );
    const workspace = yield* checkWorkspace(root);
    return [...workspace, ...overrides];
  },
);

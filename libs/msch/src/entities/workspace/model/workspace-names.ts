import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { workspaceProjects } from "./workspace-projects.ts";
import type { WorkspaceProject } from "./workspace-projects.ts";

const ALTERNATIVE = "|";
const SCOPE = /^@[^/]+\//u;
const SPECIAL = /[$()*+.?[\\\]^{|}]/gu;

export interface NamedWorkspace {
  readonly directory: string;
  readonly names: readonly string[];
  readonly packageName: Option.Option<string>;
}

/** @internal */
export const patternOf = (names: readonly string[]): RegExp => {
  const alternatives = pipe(names, Arr.map(Str.replaceAll(SPECIAL, String.raw`\$&`)));
  return new RegExp(
    `(?<![\\p{L}\\p{N}_-])(?:${Arr.join(alternatives, ALTERNATIVE)})(?![\\p{L}\\p{N}_-])`,
    "gu",
  );
};

const namedIn =
  (basename: (directory: string) => string) =>
  ({ directory, packageName }: WorkspaceProject): NamedWorkspace => {
    const unscoped = pipe(packageName, Option.map(Str.replace(SCOPE, "")));
    const names = pipe(
      [Option.some(directory), Option.some(basename(directory)), packageName, unscoped],
      Arr.getSomes,
      Arr.dedupe,
    );
    return { directory, names, packageName };
  };

/** @internal */
export const namedWorkspaces = Effect.fn("namedWorkspaces")(function* namedWorkspaces(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const projects = yield* workspaceProjects(root);
  return pipe(projects, Arr.map(namedIn((directory) => files.basename(directory))));
});

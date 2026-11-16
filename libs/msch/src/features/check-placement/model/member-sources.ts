import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const ROOT_WORKSPACE = ".";
const FIRST = 1;
const SEPARATOR = "/";
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
  ":(exclude,attr:linguist-documentation)",
];

export const memberWorkspaces = Effect.fn("memberWorkspaces")(function* memberWorkspaces(
  root: string,
) {
  const declared = yield* workspaceDirectories(root);
  return pipe(
    declared,
    Arr.filter((workspace) => workspace !== ROOT_WORKSPACE),
  );
});

export const memberSources = Effect.fn("memberSources")(function* memberSources(root: string) {
  const files = yield* RepositoryFiles;
  const workspaces = yield* memberWorkspaces(root);
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  return { workspaces, listed };
});

export interface Owned {
  readonly workspace: string;
  readonly inner: string;
}

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

export const fileProblem = (file: string, rule: RuleName, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule,
  message,
});

export const ownerOf =
  (workspaces: readonly string[]) =>
  (name: string): Option.Option<Owned> =>
    pipe(
      workspaces,
      Arr.filter((workspace) => Str.startsWith(`${workspace}${SEPARATOR}`)(name)),
      (owners) => Arr.last(Arr.sort(owners, byLength)),
      Option.map((workspace) => ({
        workspace,
        inner: Str.slice(workspace.length + SEPARATOR.length)(name),
      })),
    );

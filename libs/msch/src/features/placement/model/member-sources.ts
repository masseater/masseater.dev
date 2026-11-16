import { Array as Arr, Effect, pipe } from "effect";

import { workspaceDirectories } from "#/entities/workspace/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const ROOT_WORKSPACE = ".";
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
  ":(exclude,attr:linguist-documentation)",
];

export const memberSources = Effect.fn("memberSources")(function* memberSources(root: string) {
  const files = yield* RepositoryFiles;
  const declared = yield* workspaceDirectories(root);
  const workspaces = pipe(
    declared,
    Arr.filter((workspace) => workspace !== ROOT_WORKSPACE),
  );
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  return { workspaces, listed };
});

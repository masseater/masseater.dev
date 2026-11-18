import { Array as Arr, Effect, Option, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceProjects } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "workspace-description";
const FIRST = 1;

/** @internal */
export const checkWorkspaceDescriptions = Effect.fn("checkWorkspaceDescriptions")(
  function* checkWorkspaceDescriptions(root: string) {
    const files = yield* RepositoryFiles;
    const projects = yield* workspaceProjects(root);
    return pipe(
      projects,
      Arr.filter(({ description }) => Option.isNone(description)),
      Arr.map(({ directory }): Problem => ({
        file: files.join(root, directory, MANIFEST_FILE),
        line: FIRST,
        column: FIRST,
        rule: RULE,
        message:
          'Add a one-line "description" that says what this workspace is for. Agents find existing tools by these descriptions, so a workspace without one is invisible to them.',
      })),
    );
  },
);

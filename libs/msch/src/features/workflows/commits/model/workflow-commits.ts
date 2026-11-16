import { Array as Arr, Option, pipe } from "effect";
import { isScalar } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";
import { pairOffsets, workflowProblems } from "#/shared/lib/workflow-files.ts";

const RULE: RuleName = "workflow-commit";
const GIT_WRITE = /\bgit\s+(?:-{1,2}\S+\s+(?:\S+\s+)?)*(?:commit|push)\b/u;
const COMMIT_ACTION = /^[^@/]+\/[^@]*(?:commit|push)[^@]*(?:@|$)/iu;
const MESSAGE =
  "commits or pushes from a workflow. A bot commit leaves generated files out of review and races the next push. Regenerate the files in a commit hook (for example `.vite-hooks/pre-commit`) so they land in the author's commit, and let CI only check that they are current.";

const writesGit = (key: string, value: string): boolean =>
  (key === "run" && GIT_WRITE.test(value)) || (key === "uses" && COMMIT_ACTION.test(value));

const keyOffset = (range: readonly number[] | null | undefined): readonly number[] =>
  pipe(Option.fromNullishOr(range), Option.flatMap(Arr.head), Option.toArray);

const offsetsOf = pairOffsets((pair) => {
  if (
    isScalar(pair.key) &&
    isScalar(pair.value) &&
    typeof pair.key.value === "string" &&
    typeof pair.value.value === "string" &&
    writesGit(pair.key.value, pair.value.value)
  ) {
    return keyOffset(pair.key.range);
  }
  return [];
});

/** @internal */
export const checkWorkflowCommits = (root: string): ReturnType<typeof workflowProblems> =>
  workflowProblems(root, { rule: RULE, message: MESSAGE }, offsetsOf);

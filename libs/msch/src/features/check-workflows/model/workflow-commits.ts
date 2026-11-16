import { Array as Arr, Option, pipe } from "effect";
import { isScalar } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";

import { pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "workflow-commit";
const GIT_WRITE = /\bgit\s+(?:-{1,2}\S+\s+(?:\S+\s+)?)*(?:commit|push)\b/u;
const COMMIT_ACTION = /^[^@/]+\/[^@]*(?:commit|push)[^@]*(?:@|$)/iu;
const MESSAGE =
  "commits or pushes from a workflow. A bot commit leaves generated files out of review and races the next push. Regenerate the files in a commit hook (for example `.vite-hooks/pre-commit`) so they land in the author's commit, and let CI only check that they are current.";

const offsetsWhere =
  (name: string, pattern: RegExp) =>
  (source: string): readonly number[] =>
    pipe(
      pairsNamed(name)(source),
      Arr.filter(
        ({ value }) =>
          isScalar(value) && typeof value.value === "string" && pattern.test(value.value),
      ),
      Arr.flatMap(({ key }) =>
        pipe(
          Option.liftPredicate(key, isScalar),
          Option.flatMap(({ range }) => Option.fromNullishOr(range)),
          Option.map(([start]) => start),
          Option.toArray,
        ),
      ),
    );

const commitOffsetsOf = (source: string): readonly number[] => [
  ...offsetsWhere("run", GIT_WRITE)(source),
  ...offsetsWhere("uses", COMMIT_ACTION)(source),
];

/** @internal */
export const checkWorkflowCommits = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: commitOffsetsOf,
});

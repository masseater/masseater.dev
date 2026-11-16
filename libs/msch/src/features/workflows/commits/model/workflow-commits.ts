import { Array as Arr, Effect, Option, pipe } from "effect";
import { isPair, isScalar, parseDocument, visit } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { readWorkflows } from "#/shared/lib/workflow-files.ts";

const RULE: RuleName = "workflow-commit";
const GIT_WRITE = /\bgit\s+(?:-{1,2}\S+\s+(?:\S+\s+)?)*(?:commit|push)\b/u;
const COMMIT_ACTION = /^[^@/]+\/[^@]*(?:commit|push)[^@]*(?:@|$)/iu;
const MESSAGE =
  "commits or pushes from a workflow. A bot commit leaves generated files out of review and races the next push. Regenerate the files in a commit hook (for example `.vite-hooks/pre-commit`) so they land in the author's commit, and let CI only check that they are current.";

const writesGit = (key: string, value: string): boolean =>
  (key === "run" && GIT_WRITE.test(value)) || (key === "uses" && COMMIT_ACTION.test(value));

const keyOffset = (range: readonly number[] | null | undefined): readonly number[] =>
  pipe(Option.fromNullishOr(range), Option.flatMap(Arr.head), Option.toArray);

const offsetsOf = (source: string): readonly number[] => {
  const found: number[] = [];
  visit(parseDocument(source), {
    Pair: (_key, pair) => {
      if (
        isPair(pair) &&
        isScalar(pair.key) &&
        isScalar(pair.value) &&
        typeof pair.key.value === "string" &&
        typeof pair.value.value === "string" &&
        writesGit(pair.key.value, pair.value.value)
      ) {
        found.push(...keyOffset(pair.key.range));
      }
    },
  });
  return found;
};

/** @internal */
export const checkWorkflowCommits = Effect.fn("checkWorkflowCommits")(
  function* checkWorkflowCommits(root: string) {
    const workflows = yield* readWorkflows(root);
    return pipe(
      workflows,
      Arr.flatMap(({ file, source }): readonly Problem[] => {
        const at = positionOf(source);
        return pipe(
          offsetsOf(source),
          Arr.map((offset): Problem => {
            const { line, column } = at(offset);
            return { file, line, column, rule: RULE, message: MESSAGE };
          }),
        );
      }),
    );
  },
);

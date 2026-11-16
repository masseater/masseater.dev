import { Array as Arr, Effect, pipe } from "effect";
import { isPair, isScalar, parseDocument, visit } from "yaml";
import type { Pair } from "yaml";

import type { Finding, Problem } from "#/shared/lib/problem.ts";
import type { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { readWorkflows } from "#/shared/lib/workflow-files.ts";

export const pairsNamed =
  (name: string) =>
  (source: string): readonly Pair[] => {
    const found: Pair[] = [];
    visit(parseDocument(source), {
      Pair: (_key, pair) => {
        if (isPair(pair) && isScalar(pair.key) && pair.key.value === name) {
          found.push(pair);
        }
      },
    });
    return found;
  };

export interface WorkflowFinding extends Finding {
  readonly offsetsOf: (source: string) => readonly number[];
}

export const workflowCheck = ({
  rule,
  message,
  offsetsOf,
}: WorkflowFinding): ((
  root: string,
) => Effect.Effect<readonly Problem[], never, RepositoryFiles>) =>
  Effect.fn(rule)(function* checkWorkflows(root: string) {
    const workflows = yield* readWorkflows(root);
    return pipe(
      workflows,
      Arr.flatMap(({ file, source }): readonly Problem[] => {
        const at = positionOf(source);
        return pipe(
          offsetsOf(source),
          Arr.map((offset): Problem => {
            const { line, column } = at(offset);
            return { file, line, column, rule, message };
          }),
        );
      }),
    );
  });

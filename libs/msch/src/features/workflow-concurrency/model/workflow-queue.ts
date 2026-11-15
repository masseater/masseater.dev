import { Array as Arr, Effect, Option, pipe } from "effect";
import { isMap, isPair, isScalar, parseDocument, visit } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { readWorkflows } from "#/shared/lib/workflow-files.ts";

const CONCURRENCY_KEY = "concurrency";
const QUEUE_KEY = "queue";
const RULE: RuleName = "workflow-queue";
const MESSAGE =
  "queues runs with `queue`. A queued group runs every old push one by one, so a long run holds back the newest commit for hours. Drop `queue`: a job that later pushes redo gets `cancel-in-progress: true`, and a deploy or release job keeps the default, which lets the running one finish and replaces the waiting one with the newest run.";

const queueKeyOf = (node: unknown): Option.Option<number> =>
  pipe(
    Option.liftPredicate(node, isMap),
    Option.flatMap((map) =>
      Arr.findFirst(map.items, (item) => isScalar(item.key) && item.key.value === QUEUE_KEY),
    ),
    Option.flatMap(({ key }) => Option.liftPredicate(key, isScalar)),
    Option.flatMap((key) => Option.fromNullishOr(key.range)),
    Option.map(([start]) => start),
  );

const queueOffsetsOf = (source: string): readonly number[] => {
  const found: number[] = [];
  visit(parseDocument(source), {
    Pair: (_key, pair) => {
      if (isPair(pair) && isScalar(pair.key) && pair.key.value === CONCURRENCY_KEY) {
        found.push(...Option.toArray(queueKeyOf(pair.value)));
      }
    },
  });
  return found;
};

/** @internal */
export const checkWorkflowQueues = Effect.fn("checkWorkflowQueues")(function* checkWorkflowQueues(
  root: string,
) {
  const workflows = yield* readWorkflows(root);
  return pipe(
    workflows,
    Arr.flatMap(({ file, source }): readonly Problem[] => {
      const at = positionOf(source);
      return pipe(
        queueOffsetsOf(source),
        Arr.map((offset): Problem => {
          const { line, column } = at(offset);
          return { file, line, column, rule: RULE, message: MESSAGE };
        }),
      );
    }),
  );
});

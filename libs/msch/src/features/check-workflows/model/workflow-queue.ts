import { Array as Arr, Option, pipe } from "effect";

import type { RuleName } from "#/shared/lib/problem.ts";

import { keyOffsetIn, pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const CONCURRENCY_KEY = "concurrency";
const QUEUE_KEY = "queue";
const RULE: RuleName = "workflow-queue";
const MESSAGE =
  "queues runs with `queue`. A queued group runs every old push one by one, so a long run holds back the newest commit for hours. Drop `queue`: a job that later pushes redo gets `cancel-in-progress: true`, and a deploy or release job keeps the default, which lets the running one finish and replaces the waiting one with the newest run.";

const queueOffsetsOf = (source: string): readonly number[] =>
  pipe(
    pairsNamed(CONCURRENCY_KEY)(source),
    Arr.flatMap((pair) => Option.toArray(keyOffsetIn(QUEUE_KEY)(pair.value))),
  );

/** @internal */
export const checkWorkflowQueues = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: queueOffsetsOf,
});

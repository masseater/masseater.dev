import { expect, test } from "vite-plus/test";

import { spanCosts } from "./spans.ts";
import type { TimedSpan } from "./spans.ts";

const NANOS_PER_SECOND = 1_000_000_000;
const START = 1_000_000_000_000;
const QUICK = 2;
const SLOW = 4;
const QUEUE_WAIT = 237;
const TASK_TIME = 95;
const BOTH = QUICK + SLOW;

const span = (
  name: string,
  seconds: number,
  attributes: Readonly<Record<string, unknown>>,
): TimedSpan => ({
  name,
  startTimeUnixNano: String(START),
  endTimeUnixNano: String(START + seconds * NANOS_PER_SECOND),
  attributes,
});

test("groups spans by kind and name, and keeps a pinned action as one row", () => {
  const spans = [
    span("Run actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9", QUICK, {
      "github.step.conclusion": "success",
    }),
    span("Run actions/cache/restore@0123456789abcdef0123456789abcdef01234567", SLOW, {
      "github.step.conclusion": "success",
    }),
    span("shard (2) (queued)", QUEUE_WAIT, { "cicd.pipeline.task.run.id": "1" }),
    span("app#check", TASK_TIME, { "vp.task.command": "msch" }),
  ];
  expect(spanCosts(spans)).toMatchObject([
    { kind: "queued", name: "shard (2) (queued)", runs: 1, totalSeconds: QUEUE_WAIT },
    { kind: "task", name: "app#check", totalSeconds: TASK_TIME },
    {
      kind: "step",
      name: "Run actions/cache/restore@",
      runs: 2,
      totalSeconds: BOTH,
      p50Seconds: QUICK,
      maxSeconds: SLOW,
    },
  ]);
});

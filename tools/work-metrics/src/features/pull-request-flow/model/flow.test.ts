import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { flowOf } from "./flow.ts";
import type { PullRequestHistory } from "./flow.ts";

const MINUTE = 60_000;
const COMMITTED = 0;
const LAST_COMMIT = 10;
const OPENED = 40;
const QUEUED = 41;
const EJECTED = 45;
const REQUEUED = 50;
const UPDATED = 52;
const FIRST_CHECK_END = 44;
const UPDATED_CHECK_END = 56;
const RERUN_START = 55;
const RERUN_END = 58;
const MERGED = 60;
const QUEUED_EVENTS = 3;

const at = (minutes: number): number => minutes * MINUTE;

const HISTORY: PullRequestHistory = {
  repository: "masseater/masseater.dev",
  number: 1,
  createdAt: at(OPENED),
  events: [
    { kind: "committed", at: at(COMMITTED), sha: "a", merge: false },
    { kind: "committed", at: at(LAST_COMMIT), sha: "b", merge: false },
    { kind: "queued", at: at(QUEUED) },
    { kind: "dequeued", at: at(EJECTED) },
    { kind: "queued", at: at(REQUEUED) },
    { kind: "committed", at: at(UPDATED), sha: "c", merge: true },
    { kind: "merged", at: at(MERGED) },
  ],
  checks: [
    { sha: "b", name: "verify", start: at(QUEUED), end: at(FIRST_CHECK_END) },
    { sha: "c", name: "verify", start: at(UPDATED), end: at(UPDATED_CHECK_END) },
    { sha: "c", name: "verify", start: at(RERUN_START), end: at(RERUN_END) },
  ],
};

it("キューに入ってからマージまでを CI と待ちに分ける", () => {
  expect(flowOf(HISTORY)).toStrictEqual(
    Option.some({
      repository: "masseater/masseater.dev",
      number: 1,
      totalSeconds: 1200,
      beforeQueueSeconds: 60,
      queueSeconds: 600,
      ciSeconds: 360,
      queueWaitSeconds: 240,
      pushAfterCommitSeconds: 1800,
      branchUpdates: 1,
      ejections: 1,
      checkReruns: 1,
    }),
  );
});

it("マージされていない PR は数えない", () => {
  expect(
    flowOf({ ...HISTORY, events: HISTORY.events.slice(COMMITTED, QUEUED_EVENTS) }),
  ).toStrictEqual(Option.none());
});

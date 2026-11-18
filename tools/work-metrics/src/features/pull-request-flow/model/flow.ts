import { Array as Arr, Option, pipe } from "effect";

import { coveredMillis } from "#/shared/lib/intervals.ts";

export type FlowEvent =
  | Readonly<{ kind: "committed"; at: number; sha: string; merge: boolean }>
  | Readonly<{ kind: "queued" | "dequeued" | "merged"; at: number }>;

export type CheckRun = Readonly<{ sha: string; name: string; start: number; end: number }>;

export type PullRequestHistory = Readonly<{
  repository: string;
  number: number;
  createdAt: number;
  events: readonly FlowEvent[];
  checks: readonly CheckRun[];
}>;

export type Flow = Readonly<{
  repository: string;
  number: number;
  totalSeconds: number;
  beforeQueueSeconds: number;
  queueSeconds: number;
  ciSeconds: number;
  queueWaitSeconds: number;
  pushAfterCommitSeconds: number;
  branchUpdates: number;
  ejections: number;
  checkReruns: number;
}>;

const SECOND = 1000;
const NONE = 0;

const seconds = (millis: number): number => Math.round(Math.max(millis, NONE) / SECOND);

const timesOf = (events: readonly FlowEvent[], kind: FlowEvent["kind"]): readonly number[] =>
  pipe(
    events,
    Arr.filter((event) => event.kind === kind),
    Arr.map((event) => event.at),
  );

const lastCommitBefore = (history: PullRequestHistory): Option.Option<number> =>
  pipe(
    history.events,
    Arr.filter((event) => event.kind === "committed" && !event.merge),
    Arr.map((event) => event.at),
    Arr.filter((at) => at <= history.createdAt),
    Arr.last,
  );

const countAfter =
  (start: number) =>
  (events: readonly FlowEvent[]): number =>
    pipe(
      events,
      Arr.filter((event) => event.kind === "committed" && event.merge && event.at >= start),
      Arr.length,
    );

const reruns = (checks: readonly CheckRun[]): number =>
  checks.length -
  pipe(
    checks,
    Arr.dedupeWith((left, right) => left.sha === right.sha && left.name === right.name),
    Arr.length,
  );

const inQueue =
  (start: number, end: number) =>
  (check: CheckRun): boolean =>
    check.start >= start && check.start <= end;

const flowUntil =
  (history: PullRequestHistory) =>
  (merged: number): Flow => {
    const queued = Option.getOrElse(Arr.head(timesOf(history.events, "queued")), () => merged);
    const lastQueued = Option.getOrElse(Arr.last(timesOf(history.events, "queued")), () => merged);
    const queueChecks = pipe(history.checks, Arr.filter(inQueue(lastQueued, merged)));
    const ci = coveredMillis(queueChecks);
    const queue = merged - lastQueued;
    return {
      repository: history.repository,
      number: history.number,
      totalSeconds: seconds(merged - history.createdAt),
      beforeQueueSeconds: seconds(queued - history.createdAt),
      queueSeconds: seconds(queue),
      ciSeconds: seconds(ci),
      queueWaitSeconds: seconds(queue - ci),
      pushAfterCommitSeconds: seconds(
        history.createdAt - Option.getOrElse(lastCommitBefore(history), () => history.createdAt),
      ),
      branchUpdates: countAfter(queued)(history.events),
      ejections: timesOf(history.events, "dequeued").length,
      checkReruns: reruns(history.checks),
    };
  };

export const flowOf = (history: PullRequestHistory): Option.Option<Flow> =>
  pipe(timesOf(history.events, "merged"), Arr.last, Option.map(flowUntil(history)));

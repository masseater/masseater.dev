import { Array as Arr, Clock, Effect, Schema, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { flowOf, histories, summaryOf } from "#/features/pull-request-flow/index.ts";
import { repositoryOf } from "#/shared/api/pulls.ts";
import { sinceDays, writeReport } from "#/shared/lib/output.ts";

import { daysFlag, outFlag } from "./flags.ts";

const MINIMUM_REPOSITORIES = 1;
const PARALLEL_REPOSITORIES = 2;

const FlowRow = Schema.Struct({
  repository: Schema.String,
  number: Schema.Finite,
  totalSeconds: Schema.Finite,
  beforeQueueSeconds: Schema.Finite,
  queueSeconds: Schema.Finite,
  ciSeconds: Schema.Finite,
  queueWaitSeconds: Schema.Finite,
  pushAfterCommitSeconds: Schema.Finite,
  branchUpdates: Schema.Finite,
  ejections: Schema.Finite,
  checkReruns: Schema.Finite,
});

const runPullRequests = Effect.fn("command.pullRequests")(function* runPullRequests({
  repo,
  days,
  out,
}: Readonly<{ repo: readonly string[]; days: number; out: string }>) {
  const now = yield* Clock.currentTimeMillis;
  const since = sinceDays(days)(now);
  const found = yield* Effect.forEach(repo, (name) => histories(repositoryOf(name), since), {
    concurrency: PARALLEL_REPOSITORIES,
  });
  const flows = pipe(Arr.flatten(found), Arr.map(flowOf), Arr.getSomes);
  yield* writeReport({
    out,
    name: "pull-requests",
    codec: Schema.Array(FlowRow),
    value: flows,
    summary: `## PR open to merge, last ${String(days)} days\n\n${summaryOf(flows)}\n`,
  });
});

/** @internal */
export const pullRequestsCommand = Command.make(
  "pull-requests",
  {
    repo: Flag.String("repo").pipe(Flag.atLeast(MINIMUM_REPOSITORIES)),
    days: daysFlag,
    out: outFlag,
  },
  runPullRequests,
);

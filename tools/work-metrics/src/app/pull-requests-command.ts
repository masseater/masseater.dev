import { Array as Arr, Effect, Schema, pipe } from "effect";
import { Command } from "effect/cli";

import { flowOf, histories, summaryOf } from "#/features/pull-request-flow/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

import { daysFlag, outFlag, repoFlag } from "./flags.ts";
import { acrossRepositories } from "./repositories.ts";

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

const collect = acrossRepositories(histories);

const runPullRequests = Effect.fn("command.pullRequests")(function* runPullRequests(
  input: Readonly<{ repo: readonly string[]; days: number; out: string }>,
) {
  const found = yield* collect(input);
  const flows = pipe(found, Arr.map(flowOf), Arr.getSomes);
  yield* writeReport({
    out: input.out,
    name: "pull-requests",
    codec: Schema.Array(FlowRow),
    value: flows,
    summary: `## PR open to merge, last ${String(input.days)} days\n\n${summaryOf(flows)}\n`,
  });
});

/** @internal */
export const pullRequestsCommand = Command.make(
  "pull-requests",
  { repo: repoFlag, days: daysFlag, out: outFlag },
  runPullRequests,
);

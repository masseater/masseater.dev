import { listForRef } from "@distilled.cloud/github/checks";
import { listEventsForTimeline } from "@distilled.cloud/github/issues";
import { Array as Arr, Effect, Option, Schema, Stream, pipe } from "effect";

import type {
  CheckRun,
  FlowEvent,
  PullRequestHistory,
} from "#/features/pull-request-flow/model/flow.ts";
import { PAGE_SIZE, mergedPulls } from "#/shared/api/index.ts";
import type { Repository } from "#/shared/api/index.ts";
import { millis } from "#/shared/lib/time.ts";

const MERGE_SUBJECT = /^Merge (?:branch|remote-tracking branch|pull request) /u;
const QUEUED = new Set(["auto_merge_enabled", "auto_squash_enabled", "auto_rebase_enabled"]);

const Committed = Schema.Struct({
  event: Schema.Literal("committed"),
  sha: Schema.String,
  message: Schema.String,
  committer: Schema.Struct({ date: Schema.String }),
});

const Dated = Schema.Struct({ event: Schema.String, created_at: Schema.String });

const committedOf = (item: unknown): Option.Option<FlowEvent> =>
  pipe(
    Schema.decodeUnknownOption(Committed)(item),
    Option.map((event) => ({
      kind: "committed" as const,
      at: millis(event.committer.date),
      sha: event.sha,
      merge: MERGE_SUBJECT.test(event.message),
    })),
  );

type DatedKind = Exclude<FlowEvent["kind"], "committed">;

const kindOf = (event: string): Option.Option<DatedKind> => {
  if (QUEUED.has(event)) {
    return Option.some("queued");
  }
  if (event === "auto_merge_disabled") {
    return Option.some("dequeued");
  }
  return Option.liftPredicate(event, (name): name is DatedKind => name === "merged");
};

const datedOf = (item: unknown): Option.Option<FlowEvent> =>
  pipe(
    Schema.decodeUnknownOption(Dated)(item),
    Option.flatMap((event) =>
      Option.map(kindOf(event.event), (kind) => ({ kind, at: millis(event.created_at) })),
    ),
  );

const eventsOf = Effect.fn("pullRequestFlow.events")(function* eventsOf(
  repository: Repository,
  number: number,
) {
  const items = yield* Stream.runCollect(
    listEventsForTimeline.items({ ...repository, issue_number: number, per_page: PAGE_SIZE }),
  );
  return pipe(
    Arr.fromIterable(items),
    Arr.map((item) => Option.orElse(committedOf(item), () => datedOf(item))),
    Arr.getSomes,
  );
});

const checksOf = Effect.fn("pullRequestFlow.checks")(function* checksOf(
  repository: Repository,
  sha: string,
) {
  const found = yield* listForRef({ ...repository, ref: sha, per_page: PAGE_SIZE });
  return pipe(
    found.check_runs,
    Arr.map((run) =>
      Option.all({
        start: Option.fromNullishOr(run.started_at),
        end: Option.fromNullishOr(run.completed_at),
      }).pipe(
        Option.map(({ start, end }): CheckRun => ({
          sha,
          name: run.name,
          start: millis(start),
          end: millis(end),
        })),
      ),
    ),
    Arr.getSomes,
  );
});

const shasOf = (events: readonly FlowEvent[]): readonly string[] =>
  pipe(
    events,
    Arr.filter((event) => event.kind === "committed"),
    Arr.map((event) => event.sha),
  );

const historyOf = Effect.fn("pullRequestFlow.history")(function* historyOf(
  repository: Repository,
  pull: Readonly<{ number: number; created_at: string }>,
) {
  const events = yield* eventsOf(repository, pull.number);
  const checks = yield* Effect.forEach(shasOf(events), (sha) => checksOf(repository, sha), {
    concurrency: 4,
  });
  return {
    repository: `${repository.owner}/${repository.repo}`,
    number: pull.number,
    createdAt: millis(pull.created_at),
    events,
    checks: Arr.flatten(checks),
  } satisfies PullRequestHistory;
});

const historiesSince = Effect.fn("pullRequestFlow.histories")(function* historiesSince(
  repository: Repository,
  since: number,
) {
  const pulls = yield* mergedPulls(repository, since);
  return yield* Effect.forEach(pulls, (pull) => historyOf(repository, pull), { concurrency: 4 });
});

/** @internal */
export const histories = historiesSince;

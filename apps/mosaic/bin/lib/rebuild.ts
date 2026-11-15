import { getJson, warn } from "@masseater.dev/github-workflow";
import { Array as Arr, Config, Console, Effect, Option, Schema, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";

const RUNS = "actions/workflows/verify.yml/runs?branch=main&per_page=100";
const WINDOW = 50;
const COMPARE_FILE_LIMIT = 300;
const PLAN_JOB = "mosaic-plan";
const REFRESH_JOB = "mosaic-refresh";
/** @internal */
export const REBUILD_STEPS = ["rebuild"];
/** @internal */
export const DEPLOY_STEPS = ["deploy"];
const SUCCESS = "success";
const COMPLETED = "completed";
const SCHEDULE = "schedule";
const NO_PREVIOUS_COMMIT = /^0*$/u;
const DOCUMENT = ".md";
const REBUILDS =
  /^(?:(?:libs|tools)\/mosaic\/|apps\/mosaic\/bin\/|\.github\/actions\/mosaic-character\/)/u;
const REDEPLOYS = "apps/mosaic/";

const Run = Schema.Struct({
  id: Schema.Int,
  run_number: Schema.Int,
  head_sha: Schema.String,
  status: Schema.String,
});

const Runs = Schema.Struct({ workflow_runs: Schema.Array(Run) });

const Step = Schema.Struct({ name: Schema.String, conclusion: Schema.NullOr(Schema.String) });

const Job = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
  steps: Schema.optional(Schema.Array(Step)),
});

const Jobs = Schema.Struct({ jobs: Schema.Array(Job) });

const ChangedFile = Schema.Struct({ filename: Schema.String });

const Compare = Schema.Struct({ files: Schema.optional(Schema.Array(ChangedFile)) });

type WorkflowRun = typeof Run.Type;
type WorkflowJob = typeof Job.Type;

/** @internal */
export interface Plan {
  readonly rebuild: boolean;
  readonly web: boolean;
}

const planOf = (rebuild: boolean, web: boolean): Plan => ({ rebuild, web });

const REBUILT = planOf(true, true);
const REDEPLOYED = planOf(false, true);
const UNCHANGED = planOf(false, false);

const runs = getJson(Runs)(RUNS).pipe(Effect.map(({ workflow_runs }) => workflow_runs));

type Requirements = HttpClient.HttpClient;

type Listed<Success> = Effect.Effect<Success, Effect.Error<typeof runs>, Requirements>;

const jobsOf = (run: WorkflowRun): Listed<readonly WorkflowJob[]> =>
  getJson(Jobs)(`actions/runs/${String(run.id)}/jobs?per_page=100`).pipe(
    Effect.map(({ jobs }) => jobs),
  );

const named =
  (name: string) =>
  (job: WorkflowJob): boolean =>
    job.name === name;

const succeeded =
  (names: readonly string[]) =>
  (job: WorkflowJob): boolean =>
    pipe(
      job.steps ?? [],
      Arr.some((step) => Arr.contains(names, step.name) && step.conclusion === SUCCESS),
    );

const plansWith =
  (names: readonly string[]) =>
  (jobs: readonly WorkflowJob[]): boolean =>
    pipe(jobs, Arr.filter(named(PLAN_JOB)), Arr.some(succeeded(names)));

const refreshed =
  (run: WorkflowRun) =>
  (jobs: readonly WorkflowJob[]): boolean => {
    const refreshes = pipe(jobs, Arr.filter(named(REFRESH_JOB)));
    const deployed = pipe(refreshes, Arr.some(succeeded(DEPLOY_STEPS)));
    const pending =
      run.status !== COMPLETED &&
      pipe(
        refreshes,
        Arr.every((job) => job.status !== COMPLETED),
      );
    return deployed || pending;
  };

const rebuiltIn =
  (run: WorkflowRun) =>
  (jobs: readonly WorkflowJob[]): boolean =>
    plansWith(REBUILD_STEPS)(jobs) && refreshed(run)(jobs);

const currentRun = Config.Int("GITHUB_RUN_NUMBER");

const newerRunPlans = Effect.fn("newerRunPlans")(function* newerRunPlans(names: readonly string[]) {
  const current = yield* currentRun;
  const listed = yield* runs;
  const newer = pipe(
    listed,
    Arr.filter((run) => run.run_number > current),
  );
  const found = yield* Effect.findFirst(newer, (run) =>
    jobsOf(run).pipe(Effect.map(plansWith(names))),
  );
  if (Option.isSome(found)) {
    yield* Console.log(
      `run ${String(found.value.id)} is newer and also deploys mosaic, so it supersedes this one`,
    );
  }
  return Option.isSome(found);
});

const notSuperseded = (): Effect.Effect<boolean> =>
  warn(
    "The newer runs could not be read, so this mosaic rebuild is not treated as superseded",
  ).pipe(Effect.as(false));

const supersededByNewer = (names: readonly string[]): Effect.Effect<boolean, never, Requirements> =>
  newerRunPlans(names).pipe(
    Effect.matchEffect({ onFailure: notSuperseded, onSuccess: Effect.succeed }),
  );

const olderRuns = Effect.gen(function* olderRuns() {
  const current = yield* currentRun;
  const listed = yield* runs;
  return pipe(
    listed,
    Arr.filter((run) => run.run_number < current),
    Arr.take(WINDOW),
  );
});

const lastRebuild = (
  window: readonly WorkflowRun[],
): Effect.Effect<Option.Option<WorkflowRun>, never, Requirements> =>
  Effect.findFirst(window, (run) =>
    jobsOf(run).pipe(
      Effect.map(rebuiltIn(run)),
      Effect.orElseSucceed(() => false),
    ),
  );

const changedFiles = Effect.fn("changedFiles")(function* changedFiles(base: string) {
  const head = yield* Config.String("HEAD_SHA");
  const { files } = yield* getJson(Compare)(`compare/${base}...${head}`);
  return pipe(
    files ?? [],
    Arr.map(({ filename }) => filename),
  );
});

const planFrom = (files: readonly string[]): Plan => {
  const code = pipe(
    files,
    Arr.filter((file) => !Str.endsWith(DOCUMENT)(file)),
  );
  if (
    pipe(
      code,
      Arr.some((file) => REBUILDS.test(file)),
    )
  ) {
    return REBUILT;
  }
  if (pipe(code, Arr.some(Str.startsWith(REDEPLOYS)))) {
    return REDEPLOYED;
  }
  return UNCHANGED;
};

const rebuiltAnyway = (base: string) => (): Effect.Effect<Plan> =>
  warn(`The files changed since ${base} could not be listed completely, so mosaic is rebuilt`).pipe(
    Effect.as(REBUILT),
  );

const planSince = (base: string): Effect.Effect<Plan, never, Requirements> =>
  changedFiles(base).pipe(
    Effect.filterOrFail(
      (files) => files.length < COMPARE_FILE_LIMIT,
      () => "too many files",
    ),
    Effect.map(planFrom),
    Effect.matchEffect({ onFailure: rebuiltAnyway(base), onSuccess: Effect.succeed }),
  );

const judgedFromThisPush = (): Effect.Effect<readonly WorkflowRun[]> =>
  warn("The older runs could not be listed, so mosaic is judged from this push alone").pipe(
    Effect.as([]),
  );

const planWithoutRebuild = Effect.fn("planWithoutRebuild")(function* planWithoutRebuild(
  window: readonly WorkflowRun[],
) {
  const before = yield* Config.String("BEFORE_SHA").pipe(Config.withDefault(""));
  if (NO_PREVIOUS_COMMIT.test(before)) {
    yield* Console.log(
      "no earlier mosaic rebuild was found and this push has no previous commit, so mosaic is rebuilt",
    );
    return REBUILT;
  }
  const base = pipe(
    Arr.last(window),
    Option.map((run) => run.head_sha),
    Option.getOrElse(() => before),
  );
  yield* Console.log(
    `no earlier mosaic rebuild was found, so mosaic is judged from the changes since ${base}`,
  );
  return yield* planSince(base);
});

const pushPlan = Effect.gen(function* pushPlan() {
  const window = yield* olderRuns.pipe(
    Effect.matchEffect({ onFailure: judgedFromThisPush, onSuccess: Effect.succeed }),
  );
  const rebuilt = yield* lastRebuild(window);
  if (Option.isNone(rebuilt)) {
    return yield* planWithoutRebuild(window);
  }
  yield* Console.log(`last mosaic deploy: ${rebuilt.value.head_sha}`);
  return yield* planSince(rebuilt.value.head_sha);
});

const planOfThisRun = Effect.gen(function* planOfThisRun() {
  if (yield* supersededByNewer(REBUILD_STEPS)) {
    return UNCHANGED;
  }
  const event = yield* Config.String("GITHUB_EVENT_NAME");
  if (event === SCHEDULE) {
    return REBUILT;
  }
  return yield* pushPlan;
});

/** @internal */
export const rebuildPlan = planOfThisRun;

/** @internal */
export const supersededBy = supersededByNewer;

import type { Config } from "effect";
import {
  Array as Arr,
  ConfigProvider,
  Effect,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";

import { rebuildPlan, supersededBy } from "./rebuild.ts";
import type { Plan } from "./rebuild.ts";

const RUN_ID_BASE = 7000;
const CURRENT = 100;
const HEAD_SHA = "head-sha";
const BEFORE_SHA = "before-sha";
const NOT_FOUND = 404;
const SERVER_ERROR = 500;
const REPOSITORY = "masseater/masseater.dev";
const API = `https://api.github.com/repos/${REPOSITORY}/`;
const RUNS = "actions/workflows/verify.yml/runs";
const JOBS = /^actions\/runs\/(?<id>[0-9]+)\/jobs$/u;
const COMPARE = /^compare\/(?<range>.+)$/u;

interface RunFixture {
  readonly number: number;
  readonly status: string;
  readonly jobs: readonly {
    readonly name: string;
    readonly status: string;
    readonly steps: readonly { readonly name: string; readonly conclusion: string }[];
  }[];
}

type JobFixture = RunFixture["jobs"][number];

interface Scenario {
  readonly event: string;
  readonly before: string;
  readonly runs: readonly RunFixture[];
  readonly compares: Readonly<Record<string, readonly string[]>>;
}

const CURRENT_RUN: RunFixture = { number: CURRENT, status: "in_progress", jobs: [] };

const planJob = (rebuild: string, web = rebuild): JobFixture => ({
  name: "mosaic-plan",
  status: "completed",
  steps: [
    { name: "Run vp run -r mosaic-plan", conclusion: "success" },
    { name: "rebuild", conclusion: rebuild },
    { name: "web", conclusion: web },
  ],
});

const deployJob = (deploy: string): JobFixture => ({
  name: "mosaic-refresh",
  status: "completed",
  steps: [{ name: "deploy", conclusion: deploy }],
});

const QUEUED_DEPLOY: JobFixture = { name: "mosaic-refresh", status: "queued", steps: [] };

const runOf = (number: number, status: string, jobs: readonly JobFixture[]): RunFixture => ({
  number,
  status,
  jobs,
});

const unrelated = (number: number): RunFixture => runOf(number, "completed", [planJob("skipped")]);

const deployed = (number: number): RunFixture =>
  runOf(number, "completed", [planJob("success"), deployJob("success")]);

const rebuilding = (number: number): RunFixture =>
  runOf(number, "in_progress", [planJob("success")]);

const deployingWeb = (number: number): RunFixture =>
  runOf(number, "in_progress", [planJob("skipped", "success")]);

const awaitingDeploy = (number: number): RunFixture =>
  runOf(number, "in_progress", [planJob("success"), QUEUED_DEPLOY]);

const skippedDeploy = (number: number): RunFixture =>
  runOf(number, "completed", [planJob("success"), deployJob("skipped")]);

const failedDeploy = (number: number): RunFixture =>
  runOf(number, "completed", [planJob("success"), deployJob("failure")]);

const cancelled = (number: number): RunFixture => runOf(number, "completed", [planJob("success")]);

const shaOf = (number: number): string => `sha-${String(number)}`;

const idOf = (number: number): number => RUN_ID_BASE + number;

const summaryOf = (run: RunFixture): Readonly<Record<string, number | string>> => ({
  id: idOf(run.number),
  run_number: run.number,
  head_sha: shaOf(run.number),
  status: run.status,
});

const byNewest: Order.Order<RunFixture> = Order.flip(
  Order.mapInput(Order.Number, (run: RunFixture) => run.number),
);

const jobsFor = (runs: readonly RunFixture[], id: string): Option.Option<unknown> =>
  pipe(
    runs,
    Arr.findFirst((run) => String(idOf(run.number)) === id),
    Option.map((run) => ({ jobs: run.jobs })),
  );

const compareFor = (scenario: Scenario, range: string): Option.Option<unknown> =>
  pipe(
    Rec.get(scenario.compares, range),
    Option.map((files) => ({
      files: pipe(
        files,
        Arr.map((filename) => ({ filename })),
      ),
    })),
  );

const groupOf = (pattern: RegExp, path: string, group: string): Option.Option<string> =>
  pipe(
    Str.match(pattern)(path),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(Rec.get(group)),
  );

const bodyFor = (scenario: Scenario, path: string): Option.Option<unknown> => {
  const runs = Arr.sort([...scenario.runs, CURRENT_RUN], byNewest);
  if (path === RUNS) {
    return Option.some({
      workflow_runs: pipe(runs, Arr.map(summaryOf)),
    });
  }
  return pipe(
    groupOf(JOBS, path, "id"),
    Option.flatMap((id) => jobsFor(runs, id)),
    Option.orElse(() =>
      pipe(
        groupOf(COMPARE, path, "range"),
        Option.flatMap((range) => compareFor(scenario, range)),
      ),
    ),
  );
};

const responseFor =
  (scenario: Scenario) =>
  (request: HttpClientRequest.HttpClientRequest): HttpClientResponse.HttpClientResponse => {
    const [path] = Str.split("?")(Str.replace(API, "")(request.url));
    return Option.match(bodyFor(scenario, path), {
      onNone: () => HttpClientResponse.fromWeb(request, new Response("", { status: NOT_FOUND })),
      onSome: (body) => HttpClientResponse.fromWeb(request, Response.json(body)),
    });
  };

const UNREADABLE = HttpClient.make((request) =>
  Effect.sync(() =>
    HttpClientResponse.fromWeb(request, new Response("", { status: SERVER_ERROR })),
  ),
);

const answering = (scenario: Scenario): HttpClient.HttpClient =>
  HttpClient.make((request) => Effect.sync(() => responseFor(scenario)(request)));

const configOf = (scenario: Scenario): ConfigProvider.ConfigProvider =>
  ConfigProvider.fromUnknown({
    GITHUB_REPOSITORY: REPOSITORY,
    GH_TOKEN: "token",
    GITHUB_RUN_NUMBER: String(CURRENT),
    GITHUB_EVENT_NAME: scenario.event,
    HEAD_SHA,
    BEFORE_SHA: scenario.before,
  });

const PUSH: Scenario = { event: "push", before: BEFORE_SHA, runs: [], compares: {} };

interface Inputs {
  readonly scenario: Scenario;
  readonly client: HttpClient.HttpClient;
}

const runIn =
  ({ scenario, client }: Inputs) =>
  <Success, Failure>(
    effect: Effect.Effect<Success, Failure, HttpClient.HttpClient>,
  ): Effect.Effect<Success, Failure> =>
    effect.pipe(
      Effect.provideService(HttpClient.HttpClient, client),
      Effect.provideService(ConfigProvider.ConfigProvider, configOf(scenario)),
    );

const planOf = (scenario: Scenario): Effect.Effect<Plan, Config.ConfigError> =>
  runIn({ scenario, client: answering(scenario) })(rebuildPlan);

interface Superseding {
  readonly scenario: Scenario;
  readonly steps: readonly string[];
}

const supersededOf = ({ scenario, steps }: Superseding): Effect.Effect<boolean> =>
  runIn({ scenario, client: answering(scenario) })(supersededBy(steps));

const WITHOUT_THE_API: Inputs = { scenario: PUSH, client: UNREADABLE };

/** @internal */
const planIn = planOf;

/** @internal */
const supersededIn = supersededOf;

/** @internal */
const planWithoutTheApi = runIn(WITHOUT_THE_API)(rebuildPlan);

/** @internal */
const supersededWithoutTheApi = runIn(WITHOUT_THE_API)(supersededBy(["rebuild"]));

export {
  BEFORE_SHA,
  HEAD_SHA,
  awaitingDeploy,
  cancelled,
  deployed,
  deployingWeb,
  failedDeploy,
  planIn,
  planWithoutTheApi,
  rebuilding,
  shaOf,
  skippedDeploy,
  supersededIn,
  supersededWithoutTheApi,
  unrelated,
};
export type { RunFixture, Scenario };

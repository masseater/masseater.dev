import {
  Array as Arr,
  Effect,
  FileSystem,
  Order,
  Path,
  Record as Rec,
  Schema,
  Stream,
  pipe,
} from "effect";
import { ChildProcess } from "effect/process";

const GH_STUB = Arr.join(
  [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'file="$(sed -E \\',
    "  -e 's#^repos/[^/]+/[^/]+/##' \\",
    "  -e 's#^actions/workflows/verify\\.yml/runs\\?branch=main&.*#runs#' \\",
    "  -e 's#^actions/runs/([0-9]+)/jobs\\?per_page=100$#jobs-\\1#' \\",
    '  -e \'s#^compare/#compare-#\' <<<"$2")"',
    'jq -r "$4" "$FIXTURES/$file.json"',
    "",
  ],
  "\n",
);

const RUN_WITH_STUB = 'PATH="$STUB_BIN:$PATH" exec "$SCRIPT"';
const EXECUTABLE = 0o755;
const RUN_ID_BASE = 7000;

const CURRENT = 100;
const HEAD_SHA = "head-sha";
const BEFORE_SHA = "before-sha";

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

interface Trigger {
  readonly event: string;
  readonly before: string;
  readonly superseding: string;
}

interface Scenario {
  readonly event: string;
  readonly before: string;
  readonly superseding: string;
  readonly runs: readonly RunFixture[];
  readonly compares: Readonly<Record<string, readonly string[]>>;
}

type FixtureFile = readonly [name: string, text: string];

const CURRENT_RUN: RunFixture = { number: CURRENT, status: "in_progress", jobs: [] };

const planJob = (rebuild: string, web = rebuild): JobFixture => ({
  name: "mosaic-plan",
  status: "completed",
  steps: [
    { name: "Run .github/scripts/mosaic-touched.sh", conclusion: "success" },
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

const unrelated = (number: number): RunFixture => ({
  number,
  status: "completed",
  jobs: [planJob("skipped")],
});

const deployed = (number: number): RunFixture => ({
  number,
  status: "completed",
  jobs: [planJob("success"), deployJob("success")],
});

const rebuilding = (number: number): RunFixture => ({
  number,
  status: "in_progress",
  jobs: [planJob("success")],
});

const deployingWeb = (number: number): RunFixture => ({
  number,
  status: "in_progress",
  jobs: [planJob("skipped", "success")],
});

const awaitingDeploy = (number: number): RunFixture => ({
  number,
  status: "in_progress",
  jobs: [planJob("success"), QUEUED_DEPLOY],
});

const skippedDeploy = (number: number): RunFixture => ({
  number,
  status: "completed",
  jobs: [planJob("success"), deployJob("skipped")],
});

const failedDeploy = (number: number): RunFixture => ({
  number,
  status: "completed",
  jobs: [planJob("success"), deployJob("failure")],
});

const cancelled = (number: number): RunFixture => ({
  number,
  status: "completed",
  jobs: [planJob("success")],
});

const shaOf = (number: number): string => `sha-${String(number)}`;

const idOf = (number: number): number => RUN_ID_BASE + number;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const summaryOf = (run: RunFixture): Readonly<Record<string, number | string>> => ({
  id: idOf(run.number),
  run_number: run.number,
  head_sha: shaOf(run.number),
  status: run.status,
});

const jobsFileOf = Effect.fn("jobsFileOf")(function* jobsFileOf(run: RunFixture) {
  const json = yield* encodeJson({ jobs: run.jobs });
  const file: FixtureFile = [`jobs-${String(idOf(run.number))}.json`, json];
  return file;
});

const compareFileOf = Effect.fn("compareFileOf")(function* compareFileOf(
  compare: readonly [range: string, files: readonly string[]],
) {
  const [range, names] = compare;
  const files = pipe(
    names,
    Arr.map((filename) => ({ filename })),
  );
  const json = yield* encodeJson({ files });
  const file: FixtureFile = [`compare-${range}.json`, json];
  return file;
});

const fixturesOf = Effect.fn("fixturesOf")(function* fixturesOf(scenario: Scenario) {
  const runs = Arr.sortWith(
    [...scenario.runs, CURRENT_RUN],
    (run) => run.number,
    Order.flip(Order.Number),
  );
  const summaries = pipe(runs, Arr.map(summaryOf));
  const list = yield* encodeJson({ workflow_runs: summaries });
  const jobs = yield* pipe(runs, Effect.forEach(jobsFileOf));
  const compares = yield* Effect.forEach(Rec.toEntries(scenario.compares), compareFileOf);
  const listFile: FixtureFile = ["runs.json", list];
  return [listFile, ...jobs, ...compares];
});

const OUTPUT = "output";
const EMPTY_OUTPUT: FixtureFile = [OUTPUT, ""];

const workspaceWith = Effect.fn("workspaceWith")(function* workspaceWith(
  files: readonly FixtureFile[],
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "mosaic-rebuild-" });
  const bin = path.join(root, "bin");
  yield* fs.makeDirectory(bin);
  yield* fs.writeFileString(path.join(bin, "gh"), GH_STUB);
  yield* fs.chmod(path.join(bin, "gh"), EXECUTABLE);
  yield* Effect.forEach(
    [...files, EMPTY_OUTPUT],
    ([name, text]) => fs.writeFileString(path.join(root, name), text),
    { discard: true },
  );
  return { root, bin, output: path.join(root, OUTPUT) };
});

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

const decide = Effect.fn("decide")(function* decide(
  script: string,
  files: readonly FixtureFile[],
  trigger: Trigger,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workspace = yield* workspaceWith(files);
  const handle = yield* ChildProcess.make("bash", ["-c", RUN_WITH_STUB], {
    extendEnv: true,
    env: {
      STUB_BIN: workspace.bin,
      SCRIPT: path.resolve(import.meta.dirname, "..", "..", ".github", "scripts", script),
      FIXTURES: workspace.root,
      GITHUB_OUTPUT: workspace.output,
      GITHUB_REPOSITORY: "masseater/masseater.dev",
      GITHUB_RUN_ID: String(idOf(CURRENT)),
      GITHUB_RUN_NUMBER: String(CURRENT),
      GITHUB_EVENT_NAME: trigger.event,
      HEAD_SHA,
      BEFORE_SHA: trigger.before,
      SUPERSEDING_STEPS: trigger.superseding,
    },
  });
  const [log] = yield* Effect.all([textOf(handle.stdout), textOf(handle.stderr), handle.exitCode], {
    concurrency: "unbounded",
  });
  const written = yield* fs.readFileString(workspace.output);
  return { written, log };
});

/** @internal */
const decisionIn = Effect.fn("decisionIn")(function* decisionIn(
  script: string,
  scenario: Scenario,
) {
  const files = yield* fixturesOf(scenario);
  return yield* decide(script, files, scenario);
});

const UNREADABLE: Trigger = { event: "push", before: BEFORE_SHA, superseding: "" };

/** @internal */
const decisionWithoutTheApi = Effect.fn("decisionWithoutTheApi")(function* decisionWithoutTheApi(
  script: string,
) {
  return yield* decide(script, [], UNREADABLE);
});

export {
  BEFORE_SHA,
  HEAD_SHA,
  awaitingDeploy,
  cancelled,
  decisionIn,
  decisionWithoutTheApi,
  deployed,
  deployingWeb,
  failedDeploy,
  rebuilding,
  shaOf,
  skippedDeploy,
  unrelated,
};
export type { RunFixture, Scenario };

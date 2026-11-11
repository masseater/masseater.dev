import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Path, Schema, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";
import { parse } from "yaml";

import {
  BEFORE_SHA,
  HEAD_SHA,
  awaitingDeploy,
  cancelled,
  decisionIn,
  decisionWithoutTheApi,
  deployed,
  failedDeploy,
  rebuilding,
  shaOf,
  skippedDeploy,
  unrelated,
} from "./mosaic-rebuild.test.support.ts";
import type { RunFixture, Scenario } from "./mosaic-rebuild.test.support.ts";

const TOUCHED = "mosaic-touched.sh";
const SUPERSEDED = "mosaic-superseded.sh";

const NEWEST = 102;
const NEWER = 101;
const LATEST = 99;
const EARLIER = 98;
const WINDOW = 50;
const BEYOND_WINDOW = LATEST - WINDOW;
const ONE_NEWER = 1;
const OLDEST_IN_WINDOW = BEYOND_WINDOW + ONE_NEWER;
const COMPARE_FILE_LIMIT = 300;
const NO_BEFORE = "0000000000000000000000000000000000000000";

const UNRELATED_FILES = ["apps/portfolio/src/app/router.tsx", "libs/mosaic-like/src/index.ts"];
const MOSAIC_FILES = ["AGENTS.md", "tools/mosaic/src/site.rs"];
const TOO_MANY_FILES = Arr.makeBy(COMPARE_FILE_LIMIT, (index) => `docs/${String(index)}.md`);

const REBUILT = "mosaic=true\nweb=true\n";
const NOT_REBUILT = "mosaic=false\nweb=false\n";
const STOPPED = "superseded=true\n";
const NOT_STOPPED = "superseded=false\n";

const WAITING_FOR_VERIFY: RunFixture = { number: NEWEST, status: "in_progress", jobs: [] };

const since = (
  base: string,
  files: readonly string[],
): Readonly<Record<string, readonly string[]>> => ({ [`${base}...${HEAD_SHA}`]: files });

const push = (runs: readonly RunFixture[], compares: Scenario["compares"]): Scenario => ({
  runs,
  compares,
  event: "push",
  before: BEFORE_SHA,
  superseding: "",
});

const weekly = (scenario: Scenario): Scenario => ({ ...scenario, event: "schedule", before: "" });

const SINCE_EARLIER_ONLY = {
  ...since(shaOf(LATEST), UNRELATED_FILES),
  ...since(shaOf(EARLIER), MOSAIC_FILES),
};

const BASE_WITHOUT_MOSAIC = push(
  [unrelated(LATEST), deployed(EARLIER)],
  since(shaOf(EARLIER), UNRELATED_FILES),
);

const BASE_WITH_MOSAIC = push(
  [unrelated(LATEST), deployed(EARLIER)],
  since(shaOf(EARLIER), MOSAIC_FILES),
);

const NEWER_REBUILD = push(
  [rebuilding(NEWER), deployed(LATEST)],
  since(shaOf(LATEST), MOSAIC_FILES),
);

const NEWER_UNRELATED = push(
  [WAITING_FOR_VERIFY, unrelated(NEWER), deployed(LATEST)],
  since(shaOf(LATEST), MOSAIC_FILES),
);

const REBUILD_UNDER_WAY = push([awaitingDeploy(LATEST), deployed(EARLIER)], SINCE_EARLIER_ONLY);

const REBUILD_NOT_YET_QUEUED = push([rebuilding(LATEST), deployed(EARLIER)], SINCE_EARLIER_ONLY);

const abandonedBefore = (run: RunFixture): Scenario =>
  push([run, deployed(EARLIER)], SINCE_EARLIER_ONLY);

const NO_BASE = [unrelated(LATEST), unrelated(EARLIER)];

const TOO_MANY_CHANGES = push([deployed(LATEST)], since(shaOf(LATEST), TOO_MANY_FILES));

const OUT_OF_WINDOW = push(
  [...Arr.makeBy(WINDOW, (index) => unrelated(LATEST - index)), deployed(BEYOND_WINDOW)],
  {
    ...since(shaOf(BEYOND_WINDOW), MOSAIC_FILES),
    ...since(shaOf(OLDEST_IN_WINDOW), UNRELATED_FILES),
  },
);

interface Case {
  readonly name: string;
  readonly scenario: Scenario;
  readonly expected: string;
}

const PLAN_CASES: readonly Case[] = [
  {
    name: "前回の作り直しから mosaic に変更が無ければ作り直さない",
    scenario: BASE_WITHOUT_MOSAIC,
    expected: NOT_REBUILT,
  },
  {
    name: "前回の作り直しから mosaic に変更があれば作り直す",
    scenario: BASE_WITH_MOSAIC,
    expected: REBUILT,
  },
  {
    name: "新しい実行が作り直すと決めていれば作り直さない",
    scenario: NEWER_REBUILD,
    expected: NOT_REBUILT,
  },
  {
    name: "新しい実行が作り直さないなら自分で判定する",
    scenario: NEWER_UNRELATED,
    expected: REBUILT,
  },
  {
    name: "公開を待っている作り直しの途中の実行を前回の作り直しとして扱う",
    scenario: REBUILD_UNDER_WAY,
    expected: NOT_REBUILT,
  },
  {
    name: "公開のジョブがまだ無い作り直しの途中の実行も前回の作り直しとして扱う",
    scenario: REBUILD_NOT_YET_QUEUED,
    expected: NOT_REBUILT,
  },
  {
    name: "公開を飛ばして終わった実行は数えず、その前の作り直しと比べる",
    scenario: abandonedBefore(skippedDeploy(LATEST)),
    expected: REBUILT,
  },
  {
    name: "公開に失敗した実行は数えず、その前の作り直しと比べる",
    scenario: abandonedBefore(failedDeploy(LATEST)),
    expected: REBUILT,
  },
  {
    name: "公開のジョブが無いまま終わった実行は数えず、その前の作り直しと比べる",
    scenario: abandonedBefore(cancelled(LATEST)),
    expected: REBUILT,
  },
  {
    name: "前回の作り直しが見つからず、探した範囲に mosaic の変更が無ければ作り直さない",
    scenario: push(NO_BASE, since(shaOf(EARLIER), UNRELATED_FILES)),
    expected: NOT_REBUILT,
  },
  {
    name: "前回の作り直しが見つからず、探した範囲の push に mosaic の変更があれば作り直す",
    scenario: push(NO_BASE, {
      ...since(shaOf(EARLIER), MOSAIC_FILES),
      ...since(BEFORE_SHA, UNRELATED_FILES),
    }),
    expected: REBUILT,
  },
  {
    name: "前回の作り直しが見つからず、push の前のコミットも無ければ作り直す",
    scenario: { ...push(NO_BASE, since(NO_BEFORE, UNRELATED_FILES)), before: NO_BEFORE },
    expected: REBUILT,
  },
  {
    name: "前回の作り直しが見つからず、push の前のコミットが空でも作り直す",
    scenario: { ...push(NO_BASE, {}), before: "" },
    expected: REBUILT,
  },
  {
    name: "前回の作り直しが見つからず、自分の push の変更を読めなければ作り直す",
    scenario: push(NO_BASE, {}),
    expected: REBUILT,
  },
  {
    name: "変更されたファイルが上限まで並んだら作り直す",
    scenario: TOO_MANY_CHANGES,
    expected: REBUILT,
  },
  {
    name: "50 件より前の実行は前回の作り直しとして探さない",
    scenario: OUT_OF_WINDOW,
    expected: NOT_REBUILT,
  },
  {
    name: "週次の実行は変更が無くても作り直す",
    scenario: weekly(BASE_WITHOUT_MOSAIC),
    expected: REBUILT,
  },
  {
    name: "週次の実行も、新しい実行が作り直すと決めていれば作り直さない",
    scenario: weekly(NEWER_REBUILD),
    expected: NOT_REBUILT,
  },
];

const STOP_CASES: readonly Case[] = [
  {
    name: "新しい実行が作り直すと決めていれば止める",
    scenario: NEWER_REBUILD,
    expected: STOPPED,
  },
  {
    name: "新しい実行が作り直さないなら止めない",
    scenario: NEWER_UNRELATED,
    expected: NOT_STOPPED,
  },
  { name: "新しい実行が無ければ止めない", scenario: BASE_WITH_MOSAIC, expected: NOT_STOPPED },
  { name: "古い実行の作り直しでは止めない", scenario: REBUILD_UNDER_WAY, expected: NOT_STOPPED },
];

const writes = Effect.fn("writes")(function* writes(script: string, testCase: Case) {
  const decision = yield* decisionIn(script, testCase.scenario);
  expect(decision.written).toBe(testCase.expected);
});

const rebuildsWithoutTheApi = Effect.gen(function* rebuildsWithoutTheApi() {
  const decision = yield* decisionWithoutTheApi(TOUCHED);
  expect(decision.written).toBe(REBUILT);
});

const warnsWithoutTheApi = Effect.gen(function* warnsWithoutTheApi() {
  const decision = yield* decisionWithoutTheApi(SUPERSEDED);
  expect(decision.written).toBe(NOT_STOPPED);
  expect(Str.includes("::warning::")(decision.log)).toBe(true);
});

const Step = Schema.Struct({
  name: Schema.optional(Schema.String),
  uses: Schema.optional(Schema.String),
});

const Job = Schema.Struct({ steps: Schema.Array(Step) });

const Workflow = Schema.Struct({
  jobs: Schema.Struct({
    "mosaic-plan": Job,
    "mosaic-character": Job,
    "mosaic-deploy": Job,
    "mosaic-refresh": Job,
  }),
});

const namesOf = (job: typeof Job.Type): readonly string[] =>
  pipe(
    job.steps,
    Arr.flatMap((step) => Arr.fromNullishOr(step.name)),
  );

const usesLatestVerified = Str.includes("latest-verified");

const workflowMatchesTheScripts = Effect.gen(function* workflowMatchesTheScripts() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.resolve(import.meta.dirname, "../../.github/workflows/verify.yml");
  const source = yield* fs.readFileString(file);
  const { jobs } = yield* Schema.decodeUnknownEffect(Workflow)(parse(source));
  expect(namesOf(jobs["mosaic-plan"])).toStrictEqual(["rebuild", "web"]);
  expect(namesOf(jobs["mosaic-deploy"])).toStrictEqual(["deploy"]);
  expect(namesOf(jobs["mosaic-refresh"])).toStrictEqual(["deploy"]);
  const actions = pipe(
    [jobs["mosaic-plan"], jobs["mosaic-character"], jobs["mosaic-deploy"], jobs["mosaic-refresh"]],
    Arr.flatMap((job) => job.steps),
    Arr.flatMap((step) => Arr.fromNullishOr(step.uses)),
  );
  expect(pipe(actions, Arr.filter(usesLatestVerified))).toStrictEqual([]);
});

layer(nodeServicesLayer)("mosaic を作り直すかの判定", (it) => {
  it.effect.each(PLAN_CASES)("$name", (testCase) => writes(TOUCHED, testCase));
  it.effect("実行も変更も読めなければ作り直す", () => rebuildsWithoutTheApi);
});

layer(nodeServicesLayer)("mosaic の作り直しを止めるかの判定", (it) => {
  it.effect.each(STOP_CASES)("$name", (testCase) => writes(SUPERSEDED, testCase));
  it.effect("実行の一覧を読めなければ、警告を出して止めない", () => warnsWithoutTheApi);
});

layer(nodeServicesLayer)("verify.yml の mosaic のジョブ", (it) => {
  it.effect(
    "スクリプトが探す名前のステップを持ち、latest-verified を使わない",
    () => workflowMatchesTheScripts,
  );
});

import { layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vite-plus/test";

import {
  BEFORE_SHA,
  HEAD_SHA,
  deployed,
  deployingWeb,
  planIn,
  rebuilding,
  shaOf,
  supersededIn,
  unrelated,
} from "./rebuild.test.support.ts";
import type { RunFixture, Scenario } from "./rebuild.test.support.ts";
import type { Plan } from "./rebuild.ts";

const NEWER = 101;
const LATEST = 99;
const EARLIER = 98;

const WEB_FILES = ["apps/mosaic/AGENTS.md", "apps/mosaic/src/pages/home/ui/home.tsx"];
const DOCS_FILES = ["apps/mosaic/AGENTS.md", "libs/mosaic/AGENTS.md", "tools/mosaic/AGENTS.md"];
const REBUILD_STEPS = ["rebuild"];
const DEPLOY_STEPS = ["rebuild", "web"];

const changedSinceEarlier = (files: readonly string[]): Scenario => ({
  runs: [unrelated(LATEST), deployed(EARLIER)],
  compares: { [`${shaOf(EARLIER)}...${HEAD_SHA}`]: files },
  event: "push",
  before: BEFORE_SHA,
});

const newerThanLatest = (newer: RunFixture): Scenario => ({
  runs: [newer, deployed(LATEST)],
  compares: {},
  event: "push",
  before: BEFORE_SHA,
});

interface PlanCase {
  readonly name: string;
  readonly files: readonly string[];
  readonly expected: Plan;
}

interface StopCase {
  readonly name: string;
  readonly newer: RunFixture;
  readonly steps: readonly string[];
  readonly expected: boolean;
}

const PLAN_CASES: readonly PlanCase[] = [
  {
    name: "画面だけが変わっていれば、キャラを作り直さずに画面だけを当てる",
    files: WEB_FILES,
    expected: { rebuild: false, web: true },
  },
  {
    name: "Markdown だけが変わっていれば、作り直しも画面のデプロイもしない",
    files: DOCS_FILES,
    expected: { rebuild: false, web: false },
  },
];

const STOP_CASES: readonly StopCase[] = [
  {
    name: "キャラの作り直しは、新しい実行が画面だけを当てても止めない",
    newer: deployingWeb(NEWER),
    steps: REBUILD_STEPS,
    expected: false,
  },
  {
    name: "画面のデプロイは、新しい実行が画面を当てるなら止める",
    newer: deployingWeb(NEWER),
    steps: DEPLOY_STEPS,
    expected: true,
  },
  {
    name: "画面のデプロイは、新しい実行がキャラを作り直すときも止める",
    newer: rebuilding(NEWER),
    steps: DEPLOY_STEPS,
    expected: true,
  },
];

const plans = Effect.fn("plans")(function* plans({ files, expected }: PlanCase) {
  const plan = yield* planIn(changedSinceEarlier(files));
  expect(plan).toStrictEqual(expected);
});

const stops = Effect.fn("stops")(function* stops({ newer, steps, expected }: StopCase) {
  const superseded = yield* supersededIn({ scenario: newerThanLatest(newer), steps });
  expect(superseded).toBe(expected);
});

layer(Layer.empty)("画面だけのデプロイの判定", (it) => {
  it.effect.each(PLAN_CASES)("$name", plans);
  it.effect.each(STOP_CASES)("$name", stops);
});

import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import {
  BEFORE_SHA,
  HEAD_SHA,
  decisionIn,
  deployed,
  deployingWeb,
  rebuilding,
  shaOf,
  unrelated,
} from "./mosaic-rebuild.test.support.ts";
import type { RunFixture, Scenario } from "./mosaic-rebuild.test.support.ts";

const NEWER = 101;
const LATEST = 99;
const EARLIER = 98;

const WEB_FILES = ["apps/mosaic/AGENTS.md", "apps/mosaic/src/pages/home/ui/home.tsx"];
const DOCS_FILES = ["apps/mosaic/AGENTS.md", "libs/mosaic/AGENTS.md", "tools/mosaic/AGENTS.md"];
const DEPLOY_STEPS = "rebuild web";

const changedSinceEarlier = (files: readonly string[]): Scenario => ({
  runs: [unrelated(LATEST), deployed(EARLIER)],
  compares: { [`${shaOf(EARLIER)}...${HEAD_SHA}`]: files },
  event: "push",
  before: BEFORE_SHA,
  superseding: "",
});

const newerThanLatest = (newer: RunFixture, superseding: string): Scenario => ({
  runs: [newer, deployed(LATEST)],
  compares: {},
  event: "push",
  before: BEFORE_SHA,
  superseding,
});

interface Case {
  readonly name: string;
  readonly script: string;
  readonly scenario: Scenario;
  readonly expected: string;
}

const CASES: readonly Case[] = [
  {
    name: "画面だけが変わっていれば、キャラを作り直さずに画面だけを当てる",
    script: "mosaic-touched.sh",
    scenario: changedSinceEarlier(WEB_FILES),
    expected: "mosaic=false\nweb=true\n",
  },
  {
    name: "Markdown だけが変わっていれば、作り直しも画面のデプロイもしない",
    script: "mosaic-touched.sh",
    scenario: changedSinceEarlier(DOCS_FILES),
    expected: "mosaic=false\nweb=false\n",
  },
  {
    name: "キャラの作り直しは、新しい実行が画面だけを当てても止めない",
    script: "mosaic-superseded.sh",
    scenario: newerThanLatest(deployingWeb(NEWER), ""),
    expected: "superseded=false\n",
  },
  {
    name: "画面のデプロイは、新しい実行が画面を当てるなら止める",
    script: "mosaic-superseded.sh",
    scenario: newerThanLatest(deployingWeb(NEWER), DEPLOY_STEPS),
    expected: "superseded=true\n",
  },
  {
    name: "画面のデプロイは、新しい実行がキャラを作り直すときも止める",
    script: "mosaic-superseded.sh",
    scenario: newerThanLatest(rebuilding(NEWER), DEPLOY_STEPS),
    expected: "superseded=true\n",
  },
];

const writes = Effect.fn("writes")(function* writes({ script, scenario, expected }: Case) {
  const decision = yield* decisionIn(script, scenario);
  expect(decision.written).toBe(expected);
});

layer(nodeServicesLayer)("画面だけのデプロイの判定", (it) => {
  it.effect.each(CASES)("$name", writes);
});

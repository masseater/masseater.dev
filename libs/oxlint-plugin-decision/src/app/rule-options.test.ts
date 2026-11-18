import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Order, String as Str, pipe } from "effect";

import type { DecisionRule } from "#/entities/decision/index.ts";

import {
  PASSED,
  TIMEOUT,
  callRule,
  lintProject,
  modelOf,
  outputOf,
  withMock,
} from "./fixtures.test.support.ts";
import { loggedRequests } from "./mock-typesafe.test.support.ts";
import { decisionLines, mockEnv } from "./oxlint.test.support.ts";

const LOG_LINE = "console.log(user.email, user.phone);\n";

const otherRule: DecisionRule = { ...callRule, id: "other-call" };

const perRuleModel = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: {
      model: "typesafe/jev-latest",
      rules: [callRule, { ...otherRule, model: "typesafe/jev-1.3" }],
    },
    ruleOptions: { "other-call": { model: "typesafe/jev-1.2" } },
    env,
  });
  const requests = yield* loggedRequests;
  deepStrictEqual(
    pipe(
      requests,
      Arr.map((request) => modelOf(request)),
      (sorted) => Arr.sort(sorted, Order.String),
    ),
    ["jev-1.2", "jev-latest"],
  );
  deepStrictEqual(
    pipe(
      decisionLines(run),
      Arr.map((line) => Str.replace(/ answered.*/u, "")(line)),
      (sorted) => Arr.sort(sorted, Order.String),
    ),
    [
      "log.js:1:1: [any-call] typesafe/mock-decider",
      "log.js:1:1: [other-call] typesafe/mock-second",
    ],
  );
});

const badRuleOptions = Effect.gen(function* test() {
  const env = yield* mockEnv("test-key");
  const run = yield* lintProject({
    files: { "log.js": LOG_LINE },
    options: { rules: [callRule] },
    ruleOptions: { "any-call": { model: "nowhere" } },
    env,
    format: "default",
  });
  strictEqual(run.status === PASSED, false, outputOf(run));
  assertInclude(outputOf(run), "model must be a decision model");
});

layer(nodeServices)("rule options in the oxlint config", (it) => {
  it.effect(
    "override one rule's model and keep the others on the plugin model",
    () => withMock(perRuleModel),
    TIMEOUT,
  );
  it.effect("reject an invalid rule option", () => withMock(badRuleOptions), TIMEOUT);
});

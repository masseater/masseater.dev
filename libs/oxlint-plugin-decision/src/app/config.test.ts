import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Effect, Array as Arr, Record as Rec, String as Str, pipe } from "effect";

import { toJson } from "#/entities/decision/index.ts";
import type { DecisionPluginSetup, DecisionRule } from "#/entities/decision/index.ts";

import { PASSED, TIMEOUT, lintProject, outputOf, withMock } from "./fixtures.test.support.ts";
import { loggedRequests } from "./mock-typesafe.test.support.ts";
import {
  configSource,
  mockEnv,
  pluginPath,
  runOxlint,
  writeProject,
} from "./oxlint.test.support.ts";
import type { Services, TestError } from "./oxlint.test.support.ts";

const UNKNOWN_OPTION: object = { foo: 1 };
const REPO_CONTEXT: object = { context: { scope: "repo" } };
const UNKNOWN_PROVIDER: object = { model: "acme/model-1" };
const CHAT_MODEL: object = { model: "cloudflare/@cf/qwen/qwen3.8-27b" };
const BARE_MODEL: object = { model: "jev-latest" };
const DECISION_MODELS_ONLY = "model must be a decision model";

const customPlugin = (
  dist: string,
): string => `import { createDecisionPlugin, defineDecisionRule } from ${toJson(dist)};

export default createDecisionPlugin({
  name: "custom",
  rules: [
    defineDecisionRule({ id: "code-rule", target: "call", question: "Does this call write personal data to a log?", cutoff: 0.8 }),
    defineDecisionRule({ id: "off-rule", target: "file", question: "Is this a file?", cutoff: 0.8 }),
  ],
});
`;

const CUSTOM_LINE =
  "log.js:1:1: [code-rule] typesafe/mock-decider answered yes (0.95 >= 0.80): Does this call write personal data to a log? [Error/custom(code-rule)]";

const registersRules = Effect.scoped(
  Effect.gen(function* test() {
    const plugin = yield* pluginPath;
    const cwd = yield* writeProject({
      "plugin.mjs": customPlugin(plugin),
      "log.js": "console.log(user.email, user.phone);\n",
      "oxlint.config.ts": configSource({
        jsPlugins: ["./plugin.mjs"],
        settings: { custom: { model: "typesafe/jev-latest", ci: "fail" } },
        rules: { "custom/code-rule": "error" },
      }),
    });
    const args = ["--format", "unix", "-c", "oxlint.config.ts", "log.js"];
    const without = yield* runOxlint({ cwd, args, env: {} });
    strictEqual(without.status, PASSED, outputOf(without));
    assertInclude(without.stderr, "TYPESAFE_API_KEY is not set, skipping typesafe models");
    const withKey = yield* runOxlint({ cwd, args, env: yield* mockEnv("test-key") });
    deepStrictEqual(
      pipe(
        Str.split(withKey.stdout, "\n"),
        Arr.filter((line) => Str.includes("custom(")(line)),
      ),
      [CUSTOM_LINE],
    );
    const requests = yield* loggedRequests;
    deepStrictEqual(
      pipe(
        requests,
        Arr.flatMap(({ body }) => Rec.values(body.questions)),
        Arr.map(({ instructions }) => instructions),
      ),
      [
        'Consider only snippet "s0" in state.snippets. Does this call write personal data to a log?',
      ],
    );
  }),
);

const BELOW_CONFIDENT = 0.79;
const ABOVE_CERTAIN = 1.01;

const goodRule: DecisionRule = { id: "a", target: "call", question: "Is it bad?", cutoff: 0.8 };

const fileRuleAt = (cutoff: number): DecisionRule => ({
  ...goodRule,
  target: "file",
  location: { question: "Where?", cutoff },
});

const badConfigs: readonly (readonly [string, DecisionPluginSetup, string])[] = [
  [
    "location is configured for a non-file rule",
    { rules: [{ ...goodRule, location: { question: "Where?", cutoff: 0.8 } }] },
    "location is supported only for file rules",
  ],
  ["a location cutoff is below 0.8", { rules: [fileRuleAt(BELOW_CONFIDENT)] }, "cutoff"],
  ["a rule cutoff is below 0.8", { rules: [{ ...goodRule, cutoff: BELOW_CONFIDENT }] }, "cutoff"],
  ["a location cutoff is above 1", { rules: [fileRuleAt(ABOVE_CERTAIN)] }, "cutoff"],
  [
    "a plugin-level field is unknown",
    { rules: [goodRule], ...UNKNOWN_OPTION },
    "invalid createDecisionPlugin options: Expected no excess property",
  ],
  [
    "two rules share an id",
    { rules: [goodRule, { ...goodRule, target: "file", question: "Other?" }] },
    'oxlint-plugin-decision: rule id "a" is used more than once',
  ],
  [
    "a model names an unknown provider",
    { rules: [goodRule], ...UNKNOWN_PROVIDER },
    DECISION_MODELS_ONLY,
  ],
  ["a model is a chat model", { rules: [goodRule], ...CHAT_MODEL }, DECISION_MODELS_ONLY],
  [
    "a model has no provider prefix",
    { rules: [{ ...goodRule, ...BARE_MODEL }] },
    DECISION_MODELS_ONLY,
  ],
  [
    "a classify rule reports a label it does not list",
    {
      rules: [
        {
          ...goodRule,
          answer: { kind: "classify", labels: { ok: "Fine", bad: "Not fine" }, report: ["worse"] },
        },
      ],
    },
    "every label in report must be one of labels",
  ],
  ["a context scope is unknown", { rules: [{ ...goodRule, ...REPO_CONTEXT }] }, "context"],
];

const refuses = ([, options, expected]: readonly [
  string,
  DecisionPluginSetup,
  string,
]): Effect.Effect<void, TestError, Services> =>
  Effect.gen(function* test() {
    const run = yield* lintProject({
      files: { "pass.js": "ok();\n" },
      options,
      env: {},
      format: "default",
    });
    strictEqual(run.status === PASSED, false);
    assertInclude(outputOf(run), expected);
  });

layer(nodeServices, { excludeTestServices: true })("plugin configuration", (it) => {
  it.effect(
    "registers each rule under its own id and asks only for the enabled ones",
    () => withMock(registersRules),
    TIMEOUT,
  );
  it.effect.each(badConfigs)(
    "refuses a config where %s",
    (badConfig) => refuses(badConfig),
    TIMEOUT,
  );
});

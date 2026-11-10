import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Effect, Array as Arr, String as Str, pipe } from "effect";
import type { PlatformError } from "effect/PlatformError";

import { toJson } from "#src/runtime.ts";

import { FAILED, PASSED, TIMEOUT, outputOf, withMock } from "./fixtures.ts";
import { loggedRequests } from "./mock-openrouter.ts";
import type { MockOpenRouter } from "./mock-openrouter.ts";
import {
  configSource,
  decisionLines,
  mockEnv,
  pluginPath,
  runOxlint,
  writeProject,
} from "./oxlint.ts";
import type { OxlintRun, Services } from "./oxlint.ts";

const FAIL_SOURCE =
  'export const load = (user) => console.log("loaded", user.email, user.phone);\n';
const PASS_SOURCE = 'export const notify = (id) => console.log("notified", { userId: id });\n';

const pluginSource = (
  dist: string,
  setupExtra: string,
): string => `import { createDecisionPlugin, defineDecisionRule } from ${toJson(dist)};

export default createDecisionPlugin({
  name: "team",${setupExtra}
  rules: [
    defineDecisionRule({
      id: "no-pii-in-logs",
      target: "call",
      question:
        "Does this call write personal data, such as an email or phone number, to a log or console?",
      cutoff: 0.8,
    }),
  ],
});
`;

const lintTask = (
  setupExtra: string,
  rules: Readonly<Record<string, string>>,
): Effect.Effect<OxlintRun, PlatformError, Services | MockOpenRouter> =>
  Effect.scoped(
    Effect.gen(function* lint() {
      const plugin2 = yield* pluginPath;
      const cwd = yield* writeProject({
        "decision-plugin.mjs": pluginSource(plugin2, setupExtra),
        "oxlint.config.ts": configSource({ jsPlugins: ["./decision-plugin.mjs"], rules }),
        "fail.js": FAIL_SOURCE,
        "pass.js": PASS_SOURCE,
      });
      return yield* runOxlint({
        cwd,
        args: ["--format", "unix", "-c", "oxlint.config.ts", "fail.js", "pass.js"],
        env: yield* mockEnv("task-key"),
      });
    }),
  );

const ENABLED = { "team/no-pii-in-logs": "error" };

const expectedSolution = Effect.gen(function* test() {
  const run = yield* lintTask("", ENABLED);
  strictEqual(run.status, FAILED, outputOf(run));
  const lines = decisionLines(run);
  deepStrictEqual(
    pipe(
      lines,
      Arr.filter((line) => !Str.startsWith("fail.js:")(line)),
    ),
    [],
  );
  assertInclude(pipe(lines, Arr.join("\n")), "[no-pii-in-logs]");
  assertInclude(pipe(lines, Arr.join("\n")), "team(no-pii-in-logs)");
});

const keyInSetupIsRefused = Effect.gen(function* test() {
  const run = yield* lintTask('\n  apiKey: "sk-or-in-code",', ENABLED);
  strictEqual(run.status === PASSED, false);
  assertInclude(outputOf(run), "Expected no excess property");
  const requests = yield* loggedRequests;
  deepStrictEqual(requests, []);
});

const ruleNotEnabledSendsNothing = Effect.gen(function* test() {
  const run = yield* lintTask("", {});
  strictEqual(run.status, PASSED, outputOf(run));
  deepStrictEqual(decisionLines(run), []);
  const requests = yield* loggedRequests;
  deepStrictEqual(requests, []);
});

layer(NodeServices.layer, { excludeTestServices: true })(
  "skill task: write-decision-rules",
  (it) => {
    it.effect(
      "the skill's setup reports the failing file only",
      () => withMock(expectedSolution),
      TIMEOUT,
    );
    it.effect(
      "an API key in the plugin setup fails the run",
      () => withMock(keyInSetupIsRefused),
      TIMEOUT,
    );
    it.effect(
      "a rule that is not turned on sends no request",
      () => withMock(ruleNotEnabledSendsNothing),
      TIMEOUT,
    );
  },
);

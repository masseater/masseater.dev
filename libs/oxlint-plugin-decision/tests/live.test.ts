import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Order,
  Path,
  Redacted,
  String as Str,
  pipe,
} from "effect";
import type { Scope } from "effect";

import { toJson } from "#src/runtime.ts";

import { RESPAN, TIMEOUT, outputOf } from "./fixtures.ts";
import {
  configSource,
  decisionLines,
  packageRoot,
  pluginPath,
  runOxlint,
  writeProject,
} from "./oxlint.ts";
import type { Services, TestError } from "./oxlint.ts";

const JEV_MODEL = "openrouter/~typesafe/jev-latest";
const PROVIDER_FAILURE = /http \d+|network:|timeout|is not set/u;
const REPORTED = /^(?<where>\S+:\d+:\d+): \[(?<rule>[^\]]+)\]/u;

const EVERY_ANSWER = 0;
const EXAMPLE_MATCHES = 19;

const EXPECTED_REPORTS = Arr.sort(
  [
    "fail.js:3:8 name-matches-behavior",
    "fail.js:5:3 no-pii-in-logs",
    "fail.js:10:8 no-prompt-injection",
  ],
  Order.String,
);

type RuleEntries = Readonly<Record<string, unknown>>;

const EXAMPLE_RULES: RuleEntries = {
  "decision/no-pii-in-logs": "error",
  "decision/name-matches-behavior": "error",
  "decision/no-prompt-injection": "error",
};

const MIXED_RULES: RuleEntries = {
  ...EXAMPLE_RULES,
  "decision/no-prompt-injection": ["error", { model: JEV_MODEL }],
};

const livePlugin = (example: string, dist: string, cutoff: string): string => `
import { createDecisionPlugin } from ${toJson(dist)};
import { rules } from ${toJson(example)};

export default createDecisionPlugin({
  model: ${toJson(RESPAN)},
  rules: rules.map((rule) => Object.assign({}, rule, ${cutoff})),
});
`;

interface LiveRun {
  readonly cutoff: string;
  readonly rules: RuleEntries;
}

const exampleProject = ({
  cutoff,
  rules,
}: LiveRun): Effect.Effect<string, TestError, Services | Scope.Scope> =>
  Effect.gen(function* write() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* packageRoot;
    const plugin2 = yield* pluginPath;
    return yield* writeProject({
      "plugin.mjs": livePlugin(path.join(root, "example", "plugin.mjs"), plugin2, cutoff),
      "oxlint.config.ts": configSource({
        jsPlugins: ["./plugin.mjs"],
        rules,
      }),
      "fail.js": yield* fs.readFileString(path.join(root, "example", "fail.js")),
      "pass.js": yield* fs.readFileString(path.join(root, "example", "pass.js")),
    });
  });

const reportOf = (line: string): Option.Option<string> =>
  Option.fromNullishOr(REPORTED.exec(line)).pipe(
    Option.flatMap((found) => Option.fromUndefinedOr(found.groups)),
    Option.map((groups) => `${String(groups["where"])} ${String(groups["rule"])}`),
  );

const lintLive = (live: LiveRun): Effect.Effect<readonly string[], TestError, Services> =>
  Effect.scoped(
    Effect.gen(function* lint() {
      const key = yield* Config.Redacted("OPENROUTER_API_KEY");
      const cwd = yield* exampleProject(live);
      const run = yield* runOxlint({
        cwd,
        args: ["--format", "unix", "-c", "oxlint.config.ts", "fail.js", "pass.js"],
        env: { OPENROUTER_API_KEY: Redacted.value(key) },
      });
      const lines = decisionLines(run);
      yield* Effect.log(pipe(lines, Arr.join("\n")));
      strictEqual(PROVIDER_FAILURE.test(outputOf(run)), false, outputOf(run));
      return lines;
    }),
  );

const reportsOf = (lines: readonly string[]): readonly string[] =>
  pipe(
    lines,
    Arr.flatMap((line) => Option.toArray(reportOf(line))),
    (sorted) => Arr.sort(sorted, Order.String),
  );

const answersLive = Effect.gen(function* test() {
  const lines = yield* lintLive({ cutoff: "{}", rules: EXAMPLE_RULES });
  deepStrictEqual(reportsOf(lines), EXPECTED_REPORTS);
});

const modelsOf = (lines: readonly string[]): readonly string[] =>
  Arr.dedupe(
    pipe(
      lines,
      Arr.map((line) => Str.replace(/^.*\] (?<model>\S+) answered.*$/u, "$<model>")(line)),
    ),
  );

const mixedLive = Effect.gen(function* test() {
  const lines = yield* lintLive({
    cutoff: toJson({ cutoff: EVERY_ANSWER }),
    rules: MIXED_RULES,
  });
  const injection = pipe(
    lines,
    Arr.filter((line) => Str.includes("[no-prompt-injection]")(line)),
  );
  const others = pipe(
    lines,
    Arr.filter((line) => !Str.includes("[no-prompt-injection]")(line)),
  );
  strictEqual(lines.length, EXAMPLE_MATCHES);
  strictEqual(
    pipe(
      modelsOf(injection),
      Arr.every((model) => Str.includes("typesafe/jev")(model)),
    ),
    true,
    pipe(injection, Arr.join("\n")),
  );
  strictEqual(
    pipe(
      modelsOf(others),
      Arr.every((model) => Str.includes("respan/span-01-lite")(model)),
    ),
    true,
    pipe(others, Arr.join("\n")),
  );
  const reported = yield* lintLive({ cutoff: "{}", rules: MIXED_RULES });
  deepStrictEqual(reportsOf(reported), EXPECTED_REPORTS);
});

const probabilitiesLive = Effect.gen(function* test() {
  const lines = yield* lintLive({
    cutoff: toJson({ cutoff: EVERY_ANSWER }),
    rules: EXAMPLE_RULES,
  });
  strictEqual(lines.length, EXAMPLE_MATCHES);
});

layer(NodeServices.layer, { excludeTestServices: true })("the live OpenRouter API", (it) => {
  it.effect(
    "reports exactly the example's violations without a provider failure",
    () => answersLive,
    TIMEOUT,
  );
  it.effect(
    "answers each rule with the model its rule options pick, Respan and jev in one run",
    () => mixedLive,
    TIMEOUT,
  );
  it.effect(
    "logs the probability of every answer about the example",
    () => probabilitiesLive,
    TIMEOUT,
  );
});

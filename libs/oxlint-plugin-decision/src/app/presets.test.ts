import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertInclude, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import {
  Effect,
  Array as Arr,
  Boolean as Bool,
  Option,
  Record as Rec,
  String as Str,
  pipe,
  Order,
} from "effect";
import type { PlatformError } from "effect/PlatformError";

import { presets } from "#/features/define-presets/index.ts";

import { FAKE_SETTINGS, fakeTypesafeEnv } from "./fake-typesafe.test.support.ts";
import type { Answerer } from "./fake-typesafe.test.support.ts";
import {
  EXAMPLE_FILES,
  FAILED,
  PASSED,
  PLUGIN_NAME,
  TIMEOUT,
  configSource,
  enabled,
  exampleFiles,
  fromRoot,
  outputOf,
  oxlint,
  reportedLines,
  tempProject,
  toJson,
} from "./presets-oxlint.test.support.ts";
import type { Run, Services } from "./presets-oxlint.test.support.ts";

type PresetName = keyof typeof presets;

type Check = Effect.Effect<void, PlatformError, Services>;

const ID_START = "[";
const ID_END = "]";

const MARKERS = {
  "personal data": "user.email, user.phone",
  "language model prompt": "complete(`",
  "hard-coded secret": "sk_live_",
  "only reading or fetching": '"loaded"',
  "materially different from what its name promises": '"loaded"',
  "hides a failure the function's caller needed": "catch {}",
  "directly above this function claims": "logs the error",
  "untrusted input": "complete(`",
  "mechanism word": "processData",
  "hand-written chain": "typeof body.id",
} as const;

const YES = 0.95;
const NO = 0.05;

const flagged = (instructions: string, snippet: string): boolean =>
  pipe(
    Rec.toEntries(MARKERS),
    Arr.some(
      ([topic, marker]) => Str.includes(topic)(instructions) && Str.includes(marker)(snippet),
    ),
  );

const markerAnswer: Answerer = ({ question, snippet }) => {
  const yes = flagged(question.instructions, snippet);
  if (question.type === "noul") {
    return { type: "noul", noul: Bool.match(yes, { onTrue: () => YES, onFalse: () => NO }) };
  }
  const labels = Rec.keys(question.criteria ?? {});
  const picked = Bool.match(yes, {
    onTrue: () => Arr.last(labels),
    onFalse: () => Arr.head(labels),
  });
  const choice = Option.getOrElse(picked, () => "");
  return { type: "choice", choice, probabilities: { [choice]: YES } };
};

const fakePlugin = (core: string, presetsEntry: string, preset: string): string => `
import { createDecisionPlugin } from ${toJson(core)};
import { presets } from ${toJson(presetsEntry)};

export default createDecisionPlugin({ rules: presets[${toJson(preset)}] });
`;

const lintWithFake = (preset: PresetName): Effect.Effect<Run, PlatformError, Services> =>
  Effect.scoped(
    Effect.gen(function* lint() {
      const core = yield* fromRoot("dist", "index.mjs");
      const entry = yield* fromRoot("dist", "presets", "index.mjs");
      const cwd = yield* tempProject({
        "plugin.mjs": fakePlugin(core, entry, preset),
        ...(yield* exampleFiles),
        "oxlint.config.ts": configSource({
          jsPlugins: ["./plugin.mjs"],
          settings: { decision: { ...FAKE_SETTINGS, ci: "fail" } },
          rules: enabled("decision", presets[preset]),
        }),
      });
      const env = yield* fakeTypesafeEnv(markerAnswer);
      return yield* oxlint(
        cwd,
        ["--format", "unix", "-c", "oxlint.config.ts", ...EXAMPLE_FILES],
        env,
      );
    }),
  );

const idsOf = (lines: readonly string[]): readonly string[] =>
  pipe(
    lines,
    Arr.map((line) =>
      Option.match(Option.all([Str.indexOf(ID_START)(line), Str.indexOf(ID_END)(line)]), {
        onNone: () => "",
        onSome: ([start, end]) => Str.slice(start + ID_START.length, end)(line),
      }),
    ),
  );

const EXPECTED = {
  recommended: ["no-hardcoded-secrets", "no-pii-in-logs", "no-prompt-injection"],
  strict: [
    "no-hardcoded-secrets",
    "name-matches-behavior",
    "no-pii-in-logs",
    "no-prompt-injection",
    "untrusted-input-risk",
    "catch-hides-failure",
  ],
  reviewOnly: [
    "fn-name-promises",
    "comment-describes-declaration",
    "domain-naming",
    "prefer-schema-validation",
  ],
} as const satisfies Readonly<Record<PresetName, readonly string[]>>;

const reportsOnlyFail = (preset: PresetName): Check =>
  Effect.gen(function* test() {
    const run = yield* lintWithFake(preset);
    const lines = reportedLines(run, "decision");
    strictEqual(run.status, FAILED, outputOf(run));
    deepStrictEqual(
      pipe(
        lines,
        Arr.filter((line) => !Str.startsWith("fail.")(line)),
      ),
      [],
    );
    deepStrictEqual(Arr.sort(idsOf(lines), Order.String), Arr.sort(EXPECTED[preset], Order.String));
  });

const ENTRY_RULES = {
  recommended: presets.recommended,
  strict: presets.strict,
  "review-only": presets.reviewOnly,
  index: presets.recommended,
} as const;

const ENTRIES = ["recommended", "strict", "review-only", "index"] as const;

const loadsEntry = (entry: (typeof ENTRIES)[number]): Check =>
  Effect.scoped(
    Effect.gen(function* test() {
      const plugin = yield* fromRoot("dist", "presets", `${entry}.mjs`);
      const cwd = yield* tempProject({
        "a.js": "console.log(1);\n",
        "oxlint.config.ts": configSource({
          jsPlugins: [plugin],
          settings: { [PLUGIN_NAME]: { ci: "fail" } },
          rules: enabled(PLUGIN_NAME, ENTRY_RULES[entry]),
        }),
      });
      const run = yield* oxlint(cwd, ["-c", "oxlint.config.ts", "a.js"], { CI: "1" });
      strictEqual(run.status === PASSED, false);
      assertInclude(outputOf(run), "CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID is not set");
    }),
  );

const customExample = Effect.gen(function* test() {
  const cwd = yield* fromRoot("example-presets", "custom");
  const run = yield* oxlint(cwd, ["--format", "unix", "-c", "oxlint.config.ts", "handler.js"], {});
  strictEqual(run.status, PASSED, outputOf(run));
  assertInclude(
    run.stderr,
    "CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID is not set, skipping cloudflare models",
  );
});

layer(nodeServices, { excludeTestServices: true })("the presets", (it) => {
  it.effect(
    "recommended reports only the risky code",
    () => reportsOnlyFail("recommended"),
    TIMEOUT,
  );
  it.effect("strict adds the stricter rules", () => reportsOnlyFail("strict"), TIMEOUT);
  it.effect("reviewOnly asks only the review rules", () => reportsOnlyFail("reviewOnly"), TIMEOUT);
  it.effect.each(ENTRIES)(
    "dist/%s.mjs loads as an oxlint plugin",
    (entry) => loadsEntry(entry),
    TIMEOUT,
  );
  it.effect("the custom example combines a preset with its own rule", () => customExample, TIMEOUT);
});

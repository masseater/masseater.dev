import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { makeDetector } from "@r_masseater/h56m";
import type { Finding, H56mConfig, H56mError, H56mRule } from "@r_masseater/h56m";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { parse } from "smol-toml";
import { expect } from "vite-plus/test";

import { betterleaks } from "./index.ts";

const FIXTURE = "fixtures/betterleaks-rule-tests.json.gz";
const NO_PATH = "input";
const NO_DECODING = 0;
const TIMEOUT = 1_200_000;
const SEQUENTIAL = { concurrency: 1 } as const;

const INTENDED_OVERRIDES: ReadonlyMap<string, string> = new Map([
  ["generic-api-key/assignment", "clojars-api-token"],
  ["generic-credential-uri/true positive 8", "mongodb-connection-string"],
  ["gitlab-incoming-mail-address-token/true positive 4", "gitlab-incoming-mail-token"],
]);

const RuleTestSchema = Schema.Struct({
  rule: Schema.String,
  components: Schema.Array(Schema.String),
  name: Schema.String,
  match: Schema.Boolean,
  input: Schema.String,
  path: Schema.String,
  expect: Schema.Array(Schema.Struct({ secret: Schema.String })),
});

type RuleTest = typeof RuleTestSchema.Type;

const Recorded = Schema.fromJsonString(
  Schema.Struct({ rules: Schema.Array(Schema.String), tests: Schema.Array(RuleTestSchema) }),
);

const PresetFile = Schema.Struct({
  rules: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
});

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const idOf = (test: RuleTest): string => `${test.rule}/${test.name}`;

const pathOf = (test: RuleTest): string => {
  if (Str.isEmpty(test.path)) {
    return NO_PATH;
  }
  return test.path;
};

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const recorded = Effect.gen(function* recorded() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const bytes = yield* fileSystem.readFile(path.join(dir, FIXTURE));
  const gzipped = new Blob([Uint8Array.from(bytes)]).stream();
  const text = yield* Effect.promise(() =>
    new Response(gzipped.pipeThrough(new DecompressionStream("gzip"))).text(),
  );
  return yield* Schema.decodeEffect(Recorded)(text);
});

const presetRules = Effect.gen(function* presetRules() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(betterleaks);
  const preset = yield* Schema.decodeUnknownEffect(PresetFile)(parse(text));
  return new Map(
    pipe(
      preset.rules,
      Arr.map((rule): readonly [string, Readonly<Record<string, unknown>>] => [
        String(rule["id"]),
        rule,
      ]),
    ),
  );
});

interface Isolation {
  readonly rules: readonly string[];
  readonly definitions: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
}

const isolatedConfig =
  ({ rules, definitions }: Isolation) =>
  (test: RuleTest): H56mConfig => {
    const kept = new Set([test.rule, ...test.components]);
    const disabledRules = pipe(
      rules,
      Arr.filter((id) => !kept.has(id)),
    );
    const own = pipe(
      Option.fromNullishOr(definitions.get(test.rule)),
      Option.filter(() => test.match),
      Option.map((rule): H56mRule => ({ ...rule, id: test.rule, skipReport: false })),
      Option.toArray,
    );
    return {
      extend: { path: betterleaks, disabledRules },
      maxDecodeDepth: NO_DECODING,
      rules: own,
    };
  };

const secretsOf = (
  rule: string,
  found: readonly { readonly rule: string; readonly secret: string }[],
): readonly string[] =>
  Arr.sort(
    pipe(
      found,
      Arr.filter((each) => each.rule === rule),
      Arr.map((each) => each.secret),
    ),
    Str.Order,
  );

const isolatedOutcome =
  (isolation: Isolation) =>
  (test: RuleTest): Effect.Effect<Outcome, H56mError> =>
    makeDetector(isolatedConfig(isolation)(test)).pipe(
      Effect.flatMap((detector) => detector.scanText({ path: pathOf(test), text: test.input })),
      Effect.map((found) => ({
        id: idOf(test),
        want: Arr.sort(
          pipe(
            test.expect,
            Arr.map((each) => each.secret),
          ),
          Str.Order,
        ),
        have: secretsOf(test.rule, found),
      })),
    );

const differs = (outcome: Outcome): boolean =>
  !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

const matchesEveryRuleTest = Effect.gen(function* matchesEveryRuleTest() {
  const { rules, tests } = yield* recorded;
  const definitions = yield* presetRules;
  const outcomes = yield* Effect.forEach(
    tests,
    isolatedOutcome({ rules, definitions }),
    SEQUENTIAL,
  );
  expect(pipe(outcomes, Arr.filter(differs))).toStrictEqual([]);
});

const isReported =
  (definitions: ReadonlyMap<string, Readonly<Record<string, unknown>>>) =>
  (test: RuleTest): boolean =>
    Arr.isReadonlyArrayNonEmpty(test.expect) &&
    !pipe(
      Option.fromNullishOr(definitions.get(test.rule)),
      Option.exists((rule) => rule["skipReport"] === true),
    );

const winnerOf = (test: RuleTest): string => {
  const override = INTENDED_OVERRIDES.get(idOf(test));
  return Option.getOrElse(Option.fromNullishOr(override), () => test.rule);
};

const precedenceOutcome =
  (scanText: (test: RuleTest) => Effect.Effect<readonly { readonly rule: string }[], H56mError>) =>
  (test: RuleTest): Effect.Effect<Outcome, H56mError> =>
    Effect.map(scanText(test), (found) => {
      const winner = winnerOf(test);
      const have = pipe(
        found,
        Arr.map((each) => each.rule),
        Arr.filter((rule) => rule === winner),
        Arr.dedupe,
      );
      return { id: idOf(test), want: [winner], have };
    });

const keepsEveryRuleWithAllRulesOn = Effect.gen(function* keepsEveryRuleWithAllRulesOn() {
  const { tests } = yield* recorded;
  const definitions = yield* presetRules;
  const detector = yield* makeDetector({
    extend: { path: betterleaks },
    maxDecodeDepth: NO_DECODING,
  });
  const scanText = (test: RuleTest): Effect.Effect<readonly Finding[], H56mError> =>
    detector.scanText({ path: pathOf(test), text: test.input });
  const reported = pipe(tests, Arr.filter(isReported(definitions)));
  const outcomes = yield* Effect.forEach(reported, precedenceOutcome(scanText), SEQUENTIAL);
  expect(pipe(outcomes, Arr.filter(differs))).toStrictEqual([]);
});

layer(nodeServicesLayer)("Betterleaks rule tests", (it) => {
  it.effect(
    "reports every positive test with all rules on",
    () => keepsEveryRuleWithAllRulesOn,
    TIMEOUT,
  );
  it.effect(
    "matches every rule's own tests with the rule isolated",
    () => matchesEveryRuleTest,
    TIMEOUT,
  );
});

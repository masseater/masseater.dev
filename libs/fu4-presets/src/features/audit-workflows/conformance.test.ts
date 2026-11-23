import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lintText } from "@r_masseater/fu4";
import type { Fu4Config } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Order,
  Path,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";
import { parse } from "yaml";

import { ExpectedFinding, expectedOf, kindOf, probe } from "./conformance.test.support.ts";
import type { Expected } from "./conformance.test.support.ts";
import { AUDITS } from "./model/concerns/index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const FIXTURES = "fixtures";
const SEQUENTIAL = { concurrency: 1 } as const;
const PORTED = new Set(
  pipe(
    AUDITS,
    Arr.map((audit) => audit.ident),
  ),
);

const Case = Schema.Struct({
  input: Schema.String,
  config: Schema.NullOr(Schema.String),
  findings: Schema.Array(ExpectedFinding),
});

const ExpectedJson = Schema.fromJsonString(ExpectedFinding);

const keyOf = (entry: Expected): string =>
  Result.getOrThrow(Schema.encodeResult(ExpectedJson)(entry));

const sorted = (entries: readonly Expected[]): readonly string[] =>
  Arr.sort(pipe(entries, Arr.map(keyOf)), Order.String);

const RulesFile = Schema.Struct({ rules: Schema.optional(Schema.Unknown) });

const rulesOf = (text: Option.Option<string>): Option.Option<unknown> =>
  pipe(
    text,
    Option.map(parse),
    Option.flatMap(Schema.decodeUnknownOption(RulesFile)),
    Option.flatMap((file) => Option.fromNullishOr(file.rules)),
  );

const configOf = (rules: Option.Option<unknown>): Fu4Config => ({
  plugins: { probe: { rules: { probe } } },
  rules: { "probe/probe": "error" },
  settings: {
    zizmor: {
      ...Option.match(rules, { onNone: () => ({}), onSome: (value) => ({ rules: value }) }),
      persona: "auditor",
      online: false,
    },
  },
});

const compare = Effect.fn("compare")(function* compare(inputs: string, entry: typeof Case.Type) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(inputs, entry.input));
  const config = yield* Effect.transposeOption(
    Option.map(Option.fromNullishOr(entry.config), (file) =>
      fileSystem.readFileString(path.join(inputs, file)),
    ),
  );
  const found = yield* lintText({
    root: inputs,
    path: entry.input,
    kind: kindOf(entry.input),
    text,
    config: pipe(config, rulesOf, configOf),
  });
  const have = pipe(
    found,
    Arr.map((diagnostic) => expectedOf(diagnostic.message)),
  );
  const want = pipe(
    entry.findings,
    Arr.filter((each) => PORTED.has(each.ident)),
  );
  return { input: entry.input, want: sorted(want), have: sorted(have) };
});

const differs = (outcome: {
  readonly want: readonly string[];
  readonly have: readonly string[];
}): boolean => !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

test("matches zizmor on its recorded corpus", () =>
  Effect.gen(function* corpus() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* path.fromFileUrl(new URL(import.meta.url));
    const base = path.join(path.dirname(file), FIXTURES);
    const raw = yield* fileSystem.readFileString(path.join(base, "expected.json"));
    const cases = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Array(Case)))(raw);
    const inputs = path.join(base, "inputs");
    const outcomes = yield* Effect.forEach(cases, (entry) => compare(inputs, entry), SEQUENTIAL);
    expect(pipe(outcomes, Arr.filter(differs))).toStrictEqual([]);
  }).pipe(services.runPromise));

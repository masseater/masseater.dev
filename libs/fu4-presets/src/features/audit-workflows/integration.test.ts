import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lintText } from "@r_masseater/fu4";
import type { Fu4Config } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";
import { parse } from "yaml";

import { characterColumnOf } from "#/shared/text/index.ts";

import { isAuditable, kindOf, probe, probedOf } from "./conformance.test.support.ts";
import { KNOWN, ZIZMOR_TESTS, casesIn, knownIds } from "./integration.test.support.ts";
import type { Invocation, SnapshotCase } from "./integration.test.support.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const INPUTS = "fixtures/inputs";
const SEQUENTIAL = { concurrency: 1 } as const;
const MINIMUM_CASES = 280;
const ONE_BASED = 1;

const PERSONA = /^--persona=(?<value>\w+)$/u;
const MIN_SEVERITY = /^--min-severity=(?<value>\w+)$/u;
const MIN_CONFIDENCE = /^--min-confidence=(?<value>\w+)$/u;
const HANDLED = [PERSONA, MIN_SEVERITY, MIN_CONFIDENCE];

const valueOf =
  (pattern: RegExp) =>
  (args: readonly string[]): Option.Option<string> =>
    pipe(
      args,
      Arr.findFirst((arg) =>
        pipe(
          Option.fromNullishOr(pattern.exec(arg)),
          Option.flatMapNullishOr((match) => match.groups),
          Option.flatMapNullishOr((groups) => groups["value"]),
        ),
      ),
    );

const personaOf = (args: readonly string[]): string => {
  if (Arr.contains(args, "--pedantic")) {
    return "pedantic";
  }
  return Option.getOrElse(valueOf(PERSONA)(args), () => "regular");
};

const unhandledArgs = (args: readonly string[]): readonly string[] =>
  pipe(
    args,
    Arr.filter(
      (arg) =>
        arg !== "--pedantic" &&
        !pipe(
          HANDLED,
          Arr.some((pattern) => pattern.test(arg)),
        ),
    ),
  );

const RulesFile = Schema.Struct({ rules: Schema.optional(Schema.Unknown) });

const rulesOf = (text: Option.Option<string>): Option.Option<unknown> =>
  pipe(
    text,
    Option.map(parse),
    Option.flatMap(Schema.decodeUnknownOption(RulesFile)),
    Option.flatMapNullishOr((file) => file.rules),
  );

const configOf = (invocation: Invocation, rules: Option.Option<unknown>): Fu4Config => ({
  plugins: { probe: { rules: { probe } } },
  rules: { "probe/probe": "error" },
  settings: {
    zizmor: {
      ...Option.match(rules, { onNone: () => ({}), onSome: (value) => ({ rules: value }) }),
      persona: personaOf(invocation.args),
      ...Option.match(valueOf(MIN_SEVERITY)(invocation.args), {
        onNone: () => ({}),
        onSome: (value) => ({ minSeverity: value }),
      }),
      ...Option.match(valueOf(MIN_CONFIDENCE)(invocation.args), {
        onNone: () => ({}),
        onSome: (value) => ({ minConfidence: value }),
      }),
      online: false,
    },
  },
});

const filesUnder = Effect.fn("filesUnder")(function* filesUnder(root: string, input: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const full = path.join(root, input);
  const info = yield* fileSystem.stat(full);
  if (info.type !== "Directory") {
    return [{ file: input, shown: "" }];
  }
  const entries = yield* fileSystem.readDirectory(full, { recursive: true });
  return pipe(
    Arr.sort(entries, Str.Order),
    Arr.filter(isAuditable),
    Arr.map((entry) => ({ file: path.join(input, entry), shown: entry })),
  );
});

interface Target {
  readonly file: string;
  readonly shown: string;
}

const lintTarget = Effect.fn("lintTarget")(function* lintTarget(
  root: string,
  config: Fu4Config,
  target: Target,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(root, target.file));
  const found = yield* lintText({
    root,
    path: target.file,
    kind: kindOf(target.file),
    text,
    config,
  });
  return pipe(
    found,
    Arr.map((diagnostic) => {
      const { finding, offset } = probedOf(diagnostic.message);
      const column = characterColumnOf(text)(offset) + ONE_BASED;
      return `${target.shown}:${String(finding.line)}:${String(column)} ${finding.ident} ${finding.severity}`;
    }),
  );
});

const reasonsOf = (invocation: Invocation): readonly string[] => [
  ...invocation.unsupported,
  ...pipe(
    unhandledArgs(invocation.args),
    Arr.map((arg) => `arg ${arg}`),
  ),
];

const run = Effect.fn("run")(function* run(root: string, entry: SnapshotCase) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const reasons = reasonsOf(entry.invocation);
  if (Arr.isReadonlyArrayNonEmpty(reasons)) {
    return { id: entry.id, want: entry.expected, have: [`not run: ${Arr.join(reasons, ", ")}`] };
  }
  const config = yield* Effect.transposeOption(
    pipe(
      entry.invocation.config,
      Option.map((file) => fileSystem.readFileString(path.join(root, file))),
    ),
  );
  const settings = configOf(entry.invocation, rulesOf(config));
  const targets = yield* Effect.forEach(
    entry.invocation.inputs,
    (input) => filesUnder(root, input),
    SEQUENTIAL,
  );
  const found = yield* Effect.forEach(
    Arr.flatten(targets),
    (target) => lintTarget(root, settings, target),
    SEQUENTIAL,
  );
  return { id: entry.id, want: entry.expected, have: Arr.sort(Arr.flatten(found), Str.Order) };
});

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const differs = (outcome: Outcome): boolean =>
  !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

const RUST = /\.rs$/u;

const casesOf = Effect.fn("casesOf")(function* casesOf(dir: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(dir);
  const names = Arr.sort(entries, Str.Order);
  const sources = yield* Effect.forEach(
    names,
    (name) =>
      Effect.map(fileSystem.readFileString(path.join(dir, name)), (source) =>
        casesIn(Str.replace(RUST, "")(name))(source),
      ),
    SEQUENTIAL,
  );
  return Arr.flatten(sources);
});

interface Verdict {
  readonly unexpected: readonly Outcome[];
  readonly fixed: readonly string[];
}

const verdictOf = (known: readonly string[], outcomes: readonly Outcome[]): Verdict => {
  const failing = pipe(outcomes, Arr.filter(differs));
  const failingIds = pipe(
    failing,
    Arr.map((outcome) => outcome.id),
  );
  return {
    unexpected: pipe(
      failing,
      Arr.filter((outcome) => !Arr.contains(known, outcome.id)),
    ),
    fixed: pipe(
      known,
      Arr.filter((id) => !Arr.contains(failingIds, id)),
    ),
  };
};

test("matches zizmor on its own integration tests", () =>
  Effect.gen(function* integration() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* path.fromFileUrl(new URL(import.meta.url));
    const base = path.dirname(file);
    const cases = yield* casesOf(path.join(base, ZIZMOR_TESTS));
    const outcomes = yield* Effect.forEach(
      cases,
      (entry) => run(path.join(base, INPUTS), entry),
      SEQUENTIAL,
    );
    const knownText = yield* fileSystem.readFileString(path.join(base, KNOWN));
    expect(cases.length).toBeGreaterThan(MINIMUM_CASES);
    expect(verdictOf(knownIds(knownText), outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));

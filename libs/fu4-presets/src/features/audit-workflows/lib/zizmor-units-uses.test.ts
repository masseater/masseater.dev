import { layer as nodeServices } from "@effect/platform-node/NodeServices";
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
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { AUDITS } from "#/features/audit-workflows/concerns/index.ts";

import { parseRepository } from "./common.ts";
import { loadConfig } from "./config-decode.ts";
import { evaluateControl } from "./control.ts";
import { parsePattern, patternKey, patternMatches, urlRef, usesRef } from "./uses.ts";
import type { UsesPattern } from "./uses.ts";
import { FIXTURE, KNOWN, Recorded, knownIds, verdictOf } from "./zizmor-units.test.support.ts";
import type { Outcome, RecordedPattern, Units } from "./zizmor-units.test.support.ts";

type Case<Kind extends keyof Units> = Units[Kind][number];

const patternOf = (recorded: RecordedPattern): UsesPattern => {
  if (recorded.type === "exact-with-ref") {
    return { ...recorded, subpath: Option.fromNullishOr(recorded.subpath) };
  }
  return recorded;
};

const patternJson = (pattern: UsesPattern): unknown => {
  if (pattern.type === "exact-with-ref") {
    return { ...pattern, subpath: Option.getOrNull(pattern.subpath) };
  }
  return pattern;
};

const remoteOf = (
  text: string,
): { href: string; protocol: string; hostname: string; pathname: string } => {
  const url = new URL(text);
  return { href: url.href, protocol: url.protocol, hostname: url.hostname, pathname: url.pathname };
};

const usesMatched = (found: Case<"usesPatternMatchesUses">): unknown =>
  Result.match(parseRepository(found.uses), {
    onFailure: () => "unparsed",
    onSuccess: (uses) => patternMatches(patternOf(found.pattern))(usesRef(uses)),
  });

const evaluated = (found: Case<"controlEval">): unknown =>
  Result.match(parseRepository(found.uses), {
    onFailure: () => "unparsed",
    onSuccess: (uses) =>
      evaluateControl({ uses, comments: [], inputs: new Map(found.inputs) })(found.control),
  });

const patternOrder = Order.mapInput(
  Order.Tuple([Order.Number, Order.Array(Order.String)]),
  patternKey,
);

const parsedPattern = (found: Case<"usesPatternParse">): Outcome => ({
  id: found.id,
  want: found.result,
  have: pipe(
    Result.getSuccess(parsePattern(found.input)),
    Option.map(patternJson),
    Option.getOrNull,
  ),
});

const ordered = (found: Case<"usesPatternOrder">): Outcome => {
  const patterns = pipe(found.input, Arr.map(patternOf));
  return {
    id: found.id,
    want: found.output,
    have: pipe(Arr.sort(patterns, patternOrder), Arr.map(patternJson)),
  };
};

const urlMatched = (found: Case<"usesPatternMatchesUrl">): Outcome => {
  const ref = urlRef(remoteOf(found.url))(found.gitRef);
  return { id: found.id, want: found.result, have: patternMatches(patternOf(found.pattern))(ref) };
};

const KNOWN_AUDITS = pipe(
  AUDITS,
  Arr.map((audit) => audit.ident),
);

const configLoaded = (found: Case<"configSchema">): Outcome => ({
  id: found.id,
  want: found.valid,
  have: Result.isSuccess(loadConfig(KNOWN_AUDITS)(found.instance.rules)),
});

const outcomesOf = (units: Units): readonly Outcome[] => [
  ...pipe(units.usesPatternParse, Arr.map(parsedPattern)),
  ...pipe(units.usesPatternOrder, Arr.map(ordered)),
  ...pipe(units.usesPatternMatchesUrl, Arr.map(urlMatched)),
  ...pipe(
    units.usesPatternMatchesUses,
    Arr.map((found) => ({ id: found.id, want: found.result, have: usesMatched(found) })),
  ),
  ...pipe(
    units.controlEval,
    Arr.map((found) => ({ id: found.id, want: found.result, have: evaluated(found) })),
  ),
  ...pipe(units.configSchema, Arr.map(configLoaded)),
];

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for uses patterns, controls and config", () =>
  Effect.gen(function* matchesZizmorUses() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const verdict = verdictOf(knownIds(knownText))(outcomesOf(units));
    expect(verdict).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));

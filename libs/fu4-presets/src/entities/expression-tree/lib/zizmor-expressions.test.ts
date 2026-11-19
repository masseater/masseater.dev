import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Match,
  Option,
  Order,
  Path,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import type {
  ContextExpr,
  Evaluation,
  Expr,
  Literal,
  Origin,
  Spanned,
} from "#/entities/expression-tree/model/types.ts";

import { consteval } from "./consteval.ts";
import { asPattern, childOf, matchesPattern, singleTail } from "./context.ts";
import { asBoolean, asNumber } from "./evaluation.ts";
import { parseExpression } from "./parser.ts";
import {
  commutativeMatches,
  computedIndices,
  constevalSubexprs,
  contexts,
  dataflowContexts,
  leafExpressions,
} from "./walk.ts";
import type { ContextAt } from "./walk.ts";
import {
  evaluationOf,
  Recorded,
  knownIds,
  specialNumber,
  verdictOf,
} from "./zizmor-expressions.test.support.ts";
import type {
  BooleanCase,
  CommutativeCase,
  NumberCase,
  Outcome,
  ParseCase,
  PatternCase,
} from "./zizmor-expressions.test.support.ts";

const FIXTURE = "fixtures/zizmor/expressions.json.gz";
const KNOWN = "fixtures/zizmor/expressions-known-failures.txt";
const PARSE_FAILED = "parse failed";

const byKey = Order.mapInput(Order.String, ([key]: readonly [string, unknown]) => key);

const ZERO = 0;

const unsigned = (value: number): number => value + ZERO;

const specialOf = (value: number): string => {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (value > ZERO) {
    return "inf";
  }
  return "-inf";
};

const numberKey = (value: number): string => {
  if (Number.isFinite(value)) {
    return String(value);
  }
  return specialOf(value);
};

const evaluationJson = (value: Evaluation): unknown => {
  if (value.type === "number" && !Number.isFinite(value.value)) {
    return { type: "number", special: specialOf(value.value) };
  }
  if (value.type === "number") {
    return { type: "number", value: unsigned(value.value) };
  }
  if (value.type === "array") {
    return { type: "array", items: pipe(value.items, Arr.map(evaluationJson)) };
  }
  if (value.type === "object") {
    const entries = pipe(
      [...value.entries],
      Arr.map(([key, inner]) => [key, evaluationJson(inner)] as const),
    );
    return { type: "object", entries: Arr.sort(entries, byKey) };
  }
  return value;
};

const originJson = ({ start, end, raw }: Origin): unknown => ({ start, end, raw });

const finiteOrNull = (value: number): number | null =>
  Option.getOrNull(Option.liftPredicate(unsigned(value), Number.isFinite));

const literalJson = (literal: Literal): unknown => {
  if (literal.kind === "number") {
    return { kind: "number", value: finiteOrNull(literal.value) };
  }
  return literal;
};

type Recur = (spanned: Spanned) => unknown;

const exprJson =
  (recur: Recur) =>
  (expr: Expr): unknown =>
    Match.value(expr).pipe(
      Match.discriminatorsExhaustive("type")({
        literal: ({ literal }) => ({ type: "literal", literal: literalJson(literal) }),
        star: (star) => star,
        identifier: (identifier) => identifier,
        call: ({ func, args }) => ({ type: "call", func, args: pipe(args, Arr.map(recur)) }),
        index: ({ inner }) => ({ type: "index", inner: recur(inner) }),
        context: ({ parts }) => ({ type: "context", parts: pipe(parts, Arr.map(recur)) }),
        binary: ({ lhs, op, rhs }) => ({ type: "binary", lhs: recur(lhs), op, rhs: recur(rhs) }),
        not: ({ inner }) => ({ type: "not", inner: recur(inner) }),
      }),
    );

const spannedJson = (spanned: Spanned): unknown => ({
  origin: originJson(spanned.origin),
  expr: exprJson(spannedJson)(spanned.expr),
});

const contextJson = ({ context, spanned }: ContextAt): unknown => ({
  origin: originJson(spanned.origin),
  singleTail: Option.getOrNull(singleTail(context)),
  pattern: Option.getOrNull(asPattern(context)),
});

const originOf = (spanned: Spanned): unknown => originJson(spanned.origin);

const subexprJson = ([spanned, value]: readonly [Spanned, Evaluation]): unknown => [
  originOf(spanned),
  evaluationJson(value),
];

const recordedOf = (found: ParseCase): unknown => {
  if (Str.isString(found.error)) {
    return PARSE_FAILED;
  }
  return {
    ast: found.ast,
    consteval: found.consteval,
    contexts: found.contexts,
    dataflow: found.dataflowContexts,
    leaves: found.leafExpressions,
    indices: found.computedIndices,
    subexprs: found.constevalSubexprs,
  };
};

const parsedOf = (spanned: Spanned): unknown => ({
  ast: spannedJson(spanned),
  consteval: Option.getOrNull(Option.map(consteval(spanned.expr), evaluationJson)),
  contexts: pipe(contexts(spanned), Arr.map(contextJson)),
  dataflow: pipe(
    dataflowContexts(spanned),
    Arr.map((at) => originOf(at.spanned)),
  ),
  leaves: pipe(leafExpressions(spanned), Arr.map(originOf)),
  indices: pipe(computedIndices(spanned), Arr.map(originOf)),
  subexprs: pipe(constevalSubexprs(spanned), Arr.map(subexprJson)),
});

const parseOutcome = (found: ParseCase): Outcome => ({
  id: found.id,
  want: recordedOf(found),
  have: Result.match(parseExpression(found.src), {
    onFailure: () => PARSE_FAILED,
    onSuccess: parsedOf,
  }),
});

const isContext = (expr: Expr): expr is ContextExpr => expr.type === "context";

const contextOf = (text: string): Option.Option<ContextExpr> =>
  pipe(
    Result.getSuccess(parseExpression(text)),
    Option.map((spanned) => spanned.expr),
    Option.filter(isContext),
  );

const patternOutcome =
  (check: (pattern: string) => (context: ContextExpr) => boolean) =>
  (found: PatternCase): Outcome => ({
    id: found.id,
    want: found.result,
    have: Option.match(contextOf(found.context), {
      onNone: () => PARSE_FAILED,
      onSome: check(found.pattern),
    }),
  });

const booleanOutcome = (found: BooleanCase): Outcome => ({
  id: found.id,
  want: found.result,
  have: asBoolean(evaluationOf(found.value)),
});

const numberOutcome = (found: NumberCase): Outcome => ({
  id: found.id,
  want: numberKey(specialNumber(found.result)),
  have: numberKey(asNumber(evaluationOf(found.value))),
});

const commutativeOutcome = (found: CommutativeCase): Outcome => ({
  id: found.id,
  want: found.result,
  have: commutativeMatches(found.lhs)(found.rhs),
});

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

const loaded = Effect.gen(function* loaded() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const dir = yield* here;
  const found = yield* recorded;
  const text = yield* fileSystem.readFileString(path.join(dir, KNOWN));
  return { found, known: knownIds(text) };
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("evaluates every expression zizmor's unit tests evaluate as zizmor does", () =>
  Effect.gen(function* matchesZizmor() {
    const { found, known } = yield* loaded;
    const outcomes = [
      ...pipe(found.parse, Arr.map(parseOutcome)),
      ...pipe(found.parentOf, Arr.map(patternOutcome(childOf))),
      ...pipe(found.patternMatches, Arr.map(patternOutcome(matchesPattern))),
      ...pipe(found.asBoolean, Arr.map(booleanOutcome)),
      ...pipe(found.asNumber, Arr.map(numberOutcome)),
      ...pipe(found.commutative, Arr.map(commutativeOutcome)),
    ];
    expect(verdictOf(known)(outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));

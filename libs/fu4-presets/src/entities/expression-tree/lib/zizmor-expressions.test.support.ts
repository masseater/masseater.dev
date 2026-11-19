import { isDeepStrictEqual } from "node:util";

import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import type {
  BinaryOp,
  Evaluation,
  Expr,
  FunctionName,
  Literal,
  Spanned,
} from "#/entities/expression-tree/model/types.ts";

const SPECIALS: Readonly<Record<string, number>> = {
  NaN: Number.NaN,
  inf: Infinity,
  "-inf": -Infinity,
};

const FUNCTIONS: readonly FunctionName[] = [
  "contains",
  "startswith",
  "endswith",
  "format",
  "join",
  "tojson",
  "fromjson",
  "hashfiles",
  "case",
  "success",
  "always",
  "cancelled",
  "failure",
];

const OPS: readonly BinaryOp[] = ["and", "or", "eq", "neq", "gt", "ge", "lt", "le"];

export type RecordedEvaluation =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "number"; readonly special: string }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "array"; readonly items: readonly RecordedEvaluation[] }
  | {
      readonly type: "object";
      readonly entries: readonly (readonly [string, RecordedEvaluation])[];
    };

type LazyEvaluation = () => Schema.Codec<RecordedEvaluation>;

const itemsMember = (lazy: LazyEvaluation): Schema.Codec<RecordedEvaluation> =>
  Schema.Struct({ type: Schema.Literal("array"), items: Schema.Array(Schema.suspend(lazy)) });

const entryOf = (lazy: LazyEvaluation): Schema.Codec<readonly [string, RecordedEvaluation]> =>
  Schema.Tuple([Schema.String, Schema.suspend(lazy)]);

const entriesMember = (lazy: LazyEvaluation): Schema.Codec<RecordedEvaluation> =>
  Schema.Struct({ type: Schema.Literal("object"), entries: Schema.Array(entryOf(lazy)) });

const EvaluationSchema: Schema.Codec<RecordedEvaluation> = Schema.Union([
  Schema.Struct({ type: Schema.Literal("string"), value: Schema.String }),
  Schema.Struct({ type: Schema.Literal("number"), value: Schema.Finite }),
  Schema.Struct({ type: Schema.Literal("number"), special: Schema.String }),
  Schema.Struct({ type: Schema.Literal("boolean"), value: Schema.Boolean }),
  Schema.Struct({ type: Schema.Literal("null") }),
  itemsMember(() => EvaluationSchema),
  entriesMember(() => EvaluationSchema),
]);

const LiteralSchema: Schema.Codec<Literal> = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("number"), value: Schema.Finite }),
  Schema.Struct({ kind: Schema.Literal("string"), value: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("boolean"), value: Schema.Boolean }),
  Schema.Struct({ kind: Schema.Literal("null") }),
]);

const OriginSchema = Schema.Struct({ start: Schema.Int, end: Schema.Int, raw: Schema.String });

type LazyExpr = () => Schema.Codec<Expr>;

const spannedOf = (lazy: LazyExpr): Schema.Codec<Spanned> =>
  Schema.Struct({ origin: OriginSchema, expr: Schema.suspend(lazy) });

const callMember = (lazy: LazyExpr): Schema.Codec<Expr> =>
  Schema.Struct({
    type: Schema.Literal("call"),
    func: Schema.Literals(FUNCTIONS),
    args: Schema.Array(spannedOf(lazy)),
  });

const innerMember =
  (type: "index" | "not") =>
  (lazy: LazyExpr): Schema.Codec<Expr> =>
    Schema.Struct({ type: Schema.Literal(type), inner: spannedOf(lazy) });

const partsMember = (lazy: LazyExpr): Schema.Codec<Expr> =>
  Schema.Struct({ type: Schema.Literal("context"), parts: Schema.Array(spannedOf(lazy)) });

const binaryMember = (lazy: LazyExpr): Schema.Codec<Expr> =>
  Schema.Struct({
    type: Schema.Literal("binary"),
    lhs: spannedOf(lazy),
    op: Schema.Literals(OPS),
    rhs: spannedOf(lazy),
  });

const ExprSchema: Schema.Codec<Expr> = Schema.Union([
  Schema.Struct({ type: Schema.Literal("literal"), literal: LiteralSchema }),
  Schema.Struct({ type: Schema.Literal("star") }),
  Schema.Struct({ type: Schema.Literal("identifier"), name: Schema.String }),
  callMember(() => ExprSchema),
  innerMember("index")(() => ExprSchema),
  innerMember("not")(() => ExprSchema),
  partsMember(() => ExprSchema),
  binaryMember(() => ExprSchema),
]);

const ParseSchema = Schema.Struct({
  id: Schema.String,
  src: Schema.String,
  error: Schema.optionalKey(Schema.String),
  ast: Schema.optionalKey(Schema.Unknown),
  consteval: Schema.optionalKey(Schema.Unknown),
  contexts: Schema.optionalKey(Schema.Unknown),
  dataflowContexts: Schema.optionalKey(Schema.Unknown),
  leafExpressions: Schema.optionalKey(Schema.Unknown),
  computedIndices: Schema.optionalKey(Schema.Unknown),
  constevalSubexprs: Schema.optionalKey(Schema.Unknown),
});

const PatternSchema = Schema.Struct({
  id: Schema.String,
  pattern: Schema.String,
  context: Schema.String,
  result: Schema.Boolean,
});

const BooleanSchema = Schema.Struct({
  id: Schema.String,
  value: EvaluationSchema,
  result: Schema.Boolean,
});

const NumberSchema = Schema.Struct({
  id: Schema.String,
  value: EvaluationSchema,
  result: Schema.String,
});

const CommutativeSchema = Schema.Struct({
  id: Schema.String,
  lhs: ExprSchema,
  rhs: ExprSchema,
  result: Schema.Boolean,
});

export type ParseCase = typeof ParseSchema.Type;
export type PatternCase = typeof PatternSchema.Type;
export type BooleanCase = typeof BooleanSchema.Type;
export type NumberCase = typeof NumberSchema.Type;
export type CommutativeCase = typeof CommutativeSchema.Type;

export const Recorded = Schema.fromJsonString(
  Schema.Struct({
    parse: Schema.Array(ParseSchema),
    parentOf: Schema.Array(PatternSchema),
    patternMatches: Schema.Array(PatternSchema),
    asBoolean: Schema.Array(BooleanSchema),
    asNumber: Schema.Array(NumberSchema),
    commutative: Schema.Array(CommutativeSchema),
  }),
);

export interface Outcome {
  readonly id: string;
  readonly want: unknown;
  readonly have: unknown;
}

export const specialNumber = (text: string): number =>
  Option.getOrElse(Rec.get(SPECIALS, text), () => Number(text));

export const evaluationOf = (recorded: RecordedEvaluation): Evaluation => {
  if ("special" in recorded) {
    return { type: "number", value: specialNumber(recorded.special) };
  }
  if (recorded.type === "array") {
    return { type: "array", items: pipe(recorded.items, Arr.map(evaluationOf)) };
  }
  if (recorded.type === "object") {
    const entries = pipe(
      recorded.entries,
      Arr.map(([key, inner]) => [key, evaluationOf(inner)] as const),
    );
    return { type: "object", entries: new Map(entries) };
  }
  return recorded;
};

export const knownIds = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map((line) => Str.trim(Arr.headNonEmpty(Str.split(" #")(line)))),
    Arr.filter(Str.isNonEmpty),
  );

const differs = (outcome: Outcome): boolean => !isDeepStrictEqual(outcome.want, outcome.have);

export const verdictOf =
  (known: readonly string[]) =>
  (outcomes: readonly Outcome[]): { unexpected: readonly Outcome[]; fixed: readonly string[] } => {
    const failing = pipe(outcomes, Arr.filter(differs));
    const failed = (id: string): boolean =>
      pipe(
        failing,
        Arr.some((outcome) => outcome.id === id),
      );
    return {
      unexpected: pipe(
        failing,
        Arr.filter((outcome) => !Arr.contains(known, outcome.id)),
      ),
      fixed: pipe(
        known,
        Arr.filter((id) => !failed(id)),
      ),
    };
  };

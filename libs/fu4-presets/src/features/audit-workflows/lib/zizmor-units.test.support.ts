import { isDeepStrictEqual } from "node:util";

import { Array as Arr, Option, Result, Schema, String as Str, pipe } from "effect";

import { parseExpression } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Expr } from "#/entities/expression-tree/index.ts";
import type { ControlExpr } from "#/features/audit-workflows/model/coordinate.ts";

const isContext = (expr: Expr): expr is ContextExpr => expr.type === "context";

export const contextOf = (text: string): Option.Option<ContextExpr> =>
  pipe(
    Result.getSuccess(parseExpression(text)),
    Option.map((spanned) => spanned.expr),
    Option.filter(isContext),
  );

const Fenced = Schema.Struct({ raw: Schema.String, start: Schema.Int, end: Schema.Int });

const PatternSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("exact-with-ref"),
    owner: Schema.String,
    repo: Schema.String,
    subpath: Schema.NullOr(Schema.String),
    gitRef: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("exact-path"),
    owner: Schema.String,
    repo: Schema.String,
    subpath: Schema.String,
  }),
  Schema.Struct({ type: Schema.Literal("exact-repo"), owner: Schema.String, repo: Schema.String }),
  Schema.Struct({ type: Schema.Literal("in-repo"), owner: Schema.String, repo: Schema.String }),
  Schema.Struct({ type: Schema.Literal("in-owner"), owner: Schema.String }),
  Schema.Struct({ type: Schema.Literal("any") }),
]);

export type RecordedPattern = typeof PatternSchema.Type;

const VersionSchema = Schema.Struct({
  raw: Schema.String,
  major: Schema.Int,
  minor: Schema.Int,
  patch: Schema.Int,
});

const FieldTypeSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literals(["boolean", "free-string"]) }),
  Schema.Struct({ type: Schema.Literal("exact"), items: Schema.Array(Schema.String) }),
]);

type LazyControl = () => Schema.Codec<ControlExpr>;

const groupMember =
  (type: "all" | "any") =>
  (lazy: LazyControl): Schema.Codec<ControlExpr> =>
    Schema.Struct({ type: Schema.Literal(type), exprs: Schema.Array(Schema.suspend(lazy)) });

const notMember = (lazy: LazyControl): Schema.Codec<ControlExpr> =>
  Schema.Struct({ type: Schema.Literal("not"), expr: Schema.suspend(lazy) });

const ControlSchema: Schema.Codec<ControlExpr> = Schema.Union([
  Schema.Struct({ type: Schema.Literal("version-less-than"), version: VersionSchema }),
  Schema.Struct({
    type: Schema.Literal("field"),
    toggle: Schema.Literals(["opt-in", "opt-out"]),
    field: Schema.String,
    fieldType: FieldTypeSchema,
    satisfiedByDefault: Schema.Boolean,
  }),
  groupMember("all")(() => ControlSchema),
  groupMember("any")(() => ControlSchema),
  notMember(() => ControlSchema),
]);

const OriginSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literals(["default", "input"]), field: Schema.String }),
  Schema.Struct({ type: Schema.Literals(["uses-ref", "with-expression"]) }),
]);

const EnvSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("string"), value: Schema.String }),
  Schema.Struct({ type: Schema.Literal("number"), value: Schema.Finite }),
  Schema.Struct({ type: Schema.Literal("boolean"), value: Schema.Boolean }),
]);

const PacketSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("data"), data: Schema.String }),
  Schema.Struct({ type: Schema.Literals(["flush", "delim"]) }),
]);

const id = Schema.String;
const Strings = Schema.Array(Schema.String);
const Capture = Schema.Struct({
  id,
  comment: Schema.String,
  capture: Schema.NullOr(Schema.String),
});
const Fences = Schema.Array(Fenced);
const ParsedVersion = Schema.Struct({ major: Schema.Int, minor: Schema.Int, patch: Schema.Int });
const Patterns = Schema.Array(PatternSchema);
const Route = Schema.Array(Schema.Union([Schema.String, Schema.Int]));
const ExpansionSchema = Schema.Struct({ path: Schema.String, value: Schema.String, route: Route });
const StaticSchema = Schema.Struct({ context: Schema.String, result: Schema.Boolean });
const Input = Schema.Tuple([Schema.String, EnvSchema]);
const Origins = Schema.Array(OriginSchema);
const EvaluationSchema = Schema.Struct({ verdict: Schema.String, origins: Origins });
const FixedSchema = Schema.Struct({ type: Schema.Literal("fixed"), pattern: Schema.String });
const ConfigurableSchema = Schema.Struct({
  type: Schema.Literal("configurable"),
  pattern: Schema.String,
  control: ControlSchema,
});
const Instance = Schema.Struct({ rules: Schema.Unknown });
const Decoded = Schema.Union([
  Schema.Struct({ packet: PacketSchema }),
  Schema.Struct({ error: Schema.String }),
]);
const Tag = Schema.Tuple([Schema.String, Schema.String]);

const SplitCase = Schema.Struct({ id, input: Schema.String, output: Strings });
const FencedCase = Schema.Struct({
  id,
  text: Schema.String,
  offset: Schema.Int,
  bare: Schema.String,
  raw: Schema.String,
  start: Schema.Int,
  end: Schema.Int,
});
const AllFencedCase = Schema.Struct({ id, text: Schema.String, result: Fences });
const InputFencedCase = Schema.Struct({
  id,
  input: Schema.Literals(["Action", "Workflow"]),
  source: Schema.String,
  result: Fences,
});
const ShellCase = Schema.Struct({ id, input: Schema.String, output: Schema.String });
const EnvCase = Schema.Struct({ id, context: Schema.String, result: Schema.Boolean });
const ParseCase = Schema.Struct({ id, input: Schema.String, result: Schema.NullOr(ParsedVersion) });
const CompareCase = Schema.Struct({
  id,
  lhs: Schema.String,
  rhs: Schema.String,
  ordering: Schema.Literals(["Less", "Equal", "Greater"]),
});
const PatternParseCase = Schema.Struct({
  id,
  input: Schema.String,
  result: Schema.NullOr(PatternSchema),
});
const PatternOrderCase = Schema.Struct({ id, input: Patterns, output: Patterns });
const UrlCase = Schema.Struct({
  id,
  url: Schema.String,
  gitRef: Schema.String,
  pattern: PatternSchema,
  result: Schema.Boolean,
});
const UsesCase = Schema.Struct({
  id,
  uses: Schema.String,
  pattern: PatternSchema,
  result: Schema.Boolean,
});
const MatrixCase = Schema.Struct({
  id,
  source: Schema.String,
  job: Schema.String,
  expansions: Schema.Array(ExpansionSchema),
  indirectlyExpanded: Schema.Boolean,
  indirectInclusions: Schema.Boolean,
  indirectExclusions: Schema.Boolean,
  static: Schema.Array(StaticSchema),
});
const ControlCase = Schema.Struct({
  id,
  control: ControlSchema,
  uses: Schema.String,
  inputs: Schema.Array(Input),
  result: EvaluationSchema,
});
const UsageCase = Schema.Struct({
  id,
  source: Schema.String,
  step: Schema.Int,
  coordinate: Schema.Union([FixedSchema, ConfigurableSchema]),
  result: Schema.NullOr(Schema.Unknown),
});
const ConfigCase = Schema.Struct({ id, instance: Instance, valid: Schema.Boolean });
const EncodeCase = Schema.Struct({ id, packet: PacketSchema, bytes: Schema.String });
const DecodeCase = Schema.Struct({ id, bytes: Schema.Array(Schema.Int), result: Decoded });
const TagCase = Schema.Struct({
  id,
  tags: Schema.Array(Tag),
  subpath: Schema.NullOr(Schema.String),
  commit: Schema.String,
  result: Schema.NullOr(Schema.String),
});
const HostCase = Schema.Struct({ id, host: Schema.String, api: Schema.String });

export const Recorded = Schema.fromJsonString(
  Schema.Struct({
    splitPatterns: Schema.Array(SplitCase),
    extractFenced: Schema.Array(FencedCase),
    extractAllFenced: Schema.Array(AllFencedCase),
    fencedInInput: Schema.Array(InputFencedCase),
    normalizeShell: Schema.Array(ShellCase),
    envIsStatic: Schema.Array(EnvCase),
    versionComment: Schema.Array(Capture),
    ratchetComment: Schema.Array(Capture),
    versionParse: Schema.Array(ParseCase),
    versionCompare: Schema.Array(CompareCase),
    usesPatternParse: Schema.Array(PatternParseCase),
    usesPatternOrder: Schema.Array(PatternOrderCase),
    usesPatternMatchesUrl: Schema.Array(UrlCase),
    usesPatternMatchesUses: Schema.Array(UsesCase),
    matrix: Schema.Array(MatrixCase),
    controlEval: Schema.Array(ControlCase),
    coordinateUsage: Schema.Array(UsageCase),
    configSchema: Schema.Array(ConfigCase),
    pktEncode: Schema.Array(EncodeCase),
    pktDecode: Schema.Array(DecodeCase),
    bestTag: Schema.Array(TagCase),
    githubHost: Schema.Array(HostCase),
  }),
);

export type Units = typeof Recorded.Type;

export interface Outcome {
  readonly id: string;
  readonly want: unknown;
  readonly have: unknown;
}

export const FIXTURE = "fixtures/zizmor-units/units.json";
export const KNOWN = "fixtures/zizmor-units/units-known-failures.txt";

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
    const failed = (outcomeId: string): boolean =>
      pipe(
        failing,
        Arr.some((outcome) => outcome.id === outcomeId),
      );
    const ids = new Set(
      pipe(
        outcomes,
        Arr.map((outcome) => outcome.id),
      ),
    );
    return {
      unexpected: pipe(
        failing,
        Arr.filter((outcome) => !Arr.contains(known, outcome.id)),
      ),
      fixed: pipe(
        known,
        Arr.filter((knownId) => ids.has(knownId) && !failed(knownId)),
      ),
    };
  };

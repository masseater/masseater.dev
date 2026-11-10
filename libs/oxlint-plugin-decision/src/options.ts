import {
  Array as Arr,
  Option,
  Predicate,
  Result,
  Schema,
  String as Str,
  Record as Rec,
  pipe,
  Function as Fn,
} from "effect";

import { BOOLEAN_ANSWER, decodeRuleAnswer } from "./answer.ts";
import {
  CiBehaviorSchema,
  Cutoff,
  ExplainSettingSchema,
  RuleContextSchema,
  TargetSchema,
} from "./schema.ts";
import type {
  DecisionOptions,
  DecisionProvider,
  DecisionRule,
  ModelRef,
  ModelSpec,
  ResolvedOptions,
  ResolvedRule,
  RuleAnswer,
} from "./types.ts";

const DATA_FIRST_ARITY_3 = 3;

const DATA_FIRST_ARITY = 2;

const PREFIX = "oxlint-plugin-decision";
const PROVIDER_SEPARATOR = "/";
const ONE_RULE = 1;

const DEFAULTS = {
  ci: "fail",
  timeoutMs: 10_000,
  maxSnippetChars: 4000,
  model: "openrouter/~typesafe/jev-latest",
  env: {},
  explain: false,
} as const satisfies Required<DecisionOptions>;

const isSelector = (input: unknown): input is DecisionRule["select"] => Predicate.isFunction(input);

const RULE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const ModelSpecSchema = Schema.Union([
  Schema.NonEmptyString,
  Schema.NonEmptyArray(Schema.NonEmptyString),
]);

const ONE = 1;

const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(ONE));

const RuleId = Schema.NonEmptyString.check(
  Schema.isPattern(RULE_ID, { message: "id must be lowercase words joined by hyphens" }),
);

const OptionsSchema = Schema.Struct({
  ci: Schema.optionalKey(CiBehaviorSchema),
  timeoutMs: Schema.optionalKey(PositiveInt),
  maxSnippetChars: Schema.optionalKey(PositiveInt),
  model: Schema.optionalKey(ModelSpecSchema),
  env: Schema.optionalKey(Schema.Record(Schema.NonEmptyString, Schema.NonEmptyString)),
  explain: Schema.optionalKey(ExplainSettingSchema),
});

const RuleSchema = Schema.Struct({
  id: RuleId,
  target: TargetSchema,
  question: Schema.NonEmptyString,
  cutoff: Cutoff,
  message: Schema.optionalKey(Schema.NonEmptyString),
  select: Schema.optionalKey(Schema.declare(isSelector)),
  location: Schema.optionalKey(Schema.Struct({ question: Schema.NonEmptyString, cutoff: Cutoff })),
  model: Schema.optionalKey(ModelSpecSchema),
  context: Schema.optionalKey(RuleContextSchema),
  answer: Schema.optionalKey(Schema.Unknown),
});

const STRICT = { onExcessProperty: "error" } as const;

const decodeOptions = Schema.decodeUnknownResult(OptionsSchema, STRICT);
const decodeRule = Schema.decodeUnknownResult(RuleSchema, STRICT);

const taggedError = Schema.TaggedError;

class OptionsError extends taggedError<OptionsError, { readonly brand: unique symbol }>()(
  "OptionsError",
  { message: Schema.String },
) {}

const optionsError = (message: string): Error =>
  OptionsError.make({ message: `${PREFIX}: ${message}` });

const modelIdsOf = (spec: ModelSpec): readonly string[] => Arr.dedupe(Arr.ensure(spec));

const splitModelId = (id: string): Option.Option<readonly [string, string]> => {
  const [provider, ...rest] = Str.split(id, PROVIDER_SEPARATOR);
  const model = pipe(rest, Arr.join(PROVIDER_SEPARATOR));
  return Option.liftPredicate(
    [provider, model] as const,
    ([left, right]) => Str.isNonEmpty(left) && Str.isNonEmpty(right),
  );
};

const resolveModel: {
  (providers: Readonly<Record<string, DecisionProvider>>): (id: string) => ModelRef;
  (id: string, providers: Readonly<Record<string, DecisionProvider>>): ModelRef;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (id: string, providers: Readonly<Record<string, DecisionProvider>>): ModelRef =>
    splitModelId(id).pipe(
      Option.flatMap(([name, model]) =>
        Option.map(Option.fromUndefinedOr(providers[name]), (provider) => ({
          id,
          provider,
          model,
        })),
      ),
      Option.getOrThrowWith(() =>
        optionsError(
          `model "${id}" must be "<provider>/<model>" with a provider from: ${pipe(Rec.keys(providers), Arr.join(", "))}`,
        ),
      ),
    ),
);

const duplicateIdOf = (rules: readonly DecisionRule[]): Option.Option<string> =>
  Arr.findFirst(
    Rec.toEntries(Arr.groupBy(rules, ({ id }) => id)),
    ([, same]) => same.length > ONE_RULE,
  ).pipe(Option.map(([id]) => id));

const answerOf = (rule: DecisionRule): RuleAnswer => {
  if (Predicate.isUndefined(rule.answer)) {
    return BOOLEAN_ANSWER;
  }
  return Result.getOrThrowWith(decodeRuleAnswer(rule.answer), (issue) =>
    optionsError(`rule "${rule.id}" has an invalid answer: ${issue}`),
  );
};

type Decode<Value> = (input: unknown) => Result.Result<Value, Schema.SchemaError>;

const checked: {
  (input: unknown, what: string): <Value>(decode: Decode<Value>) => Value;
  <Value>(decode: Decode<Value>, input: unknown, what: string): Value;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  <Value>(decode: Decode<Value>, input: unknown, what: string): Value =>
    Result.getOrThrowWith(decode(input), (issue) =>
      optionsError(`invalid ${what}: ${issue.message}`),
    ),
);

const checkRule = (rule: DecisionRule): DecisionRule => {
  checked(decodeRule, rule, `rule "${rule.id}"`);
  if (Predicate.isNotUndefined(rule.location) && rule.target !== "file") {
    throw optionsError("location is supported only for file rules");
  }
  answerOf(rule);
  return rule;
};

const checkRules = (rules: readonly DecisionRule[]): readonly DecisionRule[] => {
  if (!Arr.isReadonlyArrayNonEmpty(rules)) {
    throw optionsError("rules must list at least one rule");
  }
  Option.map(duplicateIdOf(rules), (duplicate) => {
    throw optionsError(`rule id "${duplicate}" is used more than once`);
  });
  return pipe(
    rules,
    Arr.map((rule) => checkRule(rule)),
  );
};

const resolveRule =
  (fallback: ModelSpec, providers: Readonly<Record<string, DecisionProvider>>) =>
  (rule: DecisionRule): ResolvedRule => ({
    ...rule,
    answer: answerOf(rule),
    models: pipe(
      modelIdsOf(rule.model ?? fallback),
      Arr.map((id) => resolveModel(id, providers)),
    ),
  });

interface Sources {
  readonly options: DecisionOptions;
  readonly settings?: unknown;
}

const settingsFrom = (settings: unknown): DecisionOptions => {
  if (Predicate.isUndefined(settings)) {
    return {};
  }
  return checked(decodeOptions, settings, "settings");
};

const resolveOptions: {
  (
    rules: readonly DecisionRule[],
    providers: Readonly<Record<string, DecisionProvider>>,
  ): (sources: Sources) => ResolvedOptions;
  (
    sources: Sources,
    rules: readonly DecisionRule[],
    providers: Readonly<Record<string, DecisionProvider>>,
  ): ResolvedOptions;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    { options, settings }: Sources,
    rules: readonly DecisionRule[],
    providers: Readonly<Record<string, DecisionProvider>>,
  ): ResolvedOptions => {
    const fromCode = checked(decodeOptions, options, "createDecisionPlugin options");
    const { model, ...merged } = { ...DEFAULTS, ...fromCode, ...settingsFrom(settings) };
    return {
      ci: merged.ci,
      timeoutMs: merged.timeoutMs,
      maxSnippetChars: merged.maxSnippetChars,
      env: merged.env,
      explain: merged.explain,
      rules: pipe(
        checkRules(rules),
        Arr.map((rule) => resolveRule(model, providers)(rule)),
      ),
    };
  },
);

export type { Decode, Sources };
export {
  checkRules,
  optionsError,
  PREFIX,
  ModelSpecSchema,
  STRICT,
  checked,
  modelIdsOf,
  resolveModel,
  resolveOptions,
};

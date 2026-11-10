import type { RuleOptionsSchema } from "@oxlint/plugins";
import { Option, Predicate, Schema, Array as Arr, pipe, Function as Fn } from "effect";

import { ModelSpecSchema, STRICT, checked, modelIdsOf, resolveModel } from "./options.ts";
import type { DecisionProvider, ResolvedRule } from "./types.ts";

const DATA_FIRST_ARITY_3 = 3;

const RuleOverrideSchema = Schema.Struct({
  model: Schema.optionalKey(ModelSpecSchema),
});

const RULE_OPTIONS_SCHEMA = [
  {
    type: "object",
    additionalProperties: false,
    properties: {
      model: {
        oneOf: [
          { type: "string", minLength: 1 },
          { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        ],
      },
    },
  },
] satisfies RuleOptionsSchema;

const decodeOverride = Schema.decodeUnknownResult(RuleOverrideSchema, STRICT);

const overrideRule: {
  (
    raw: unknown,
    providers: Readonly<Record<string, DecisionProvider>>,
  ): (rule: ResolvedRule) => ResolvedRule;
  (
    rule: ResolvedRule,
    raw: unknown,
    providers: Readonly<Record<string, DecisionProvider>>,
  ): ResolvedRule;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    rule: ResolvedRule,
    raw: unknown,
    providers: Readonly<Record<string, DecisionProvider>>,
  ): ResolvedRule => {
    if (Predicate.isUndefined(raw)) {
      return rule;
    }
    const { model } = checked(decodeOverride, raw, `options for rule "${rule.id}"`);
    return {
      ...rule,
      models: Option.match(Option.fromUndefinedOr(model), {
        onNone: () => rule.models,
        onSome: (spec) =>
          pipe(
            modelIdsOf(spec),
            Arr.map((id) => resolveModel(id, providers)),
          ),
      }),
    };
  },
);

export { RULE_OPTIONS_SCHEMA, overrideRule };

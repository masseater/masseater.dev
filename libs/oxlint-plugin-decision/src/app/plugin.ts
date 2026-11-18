import type { Plugin, RuleMeta } from "@oxlint/plugins";
import { Array as Arr, Record as Rec, Struct, pipe } from "effect";

import { PREFIX, checkRules, resolveOptions, toJson } from "#/entities/decision/index.ts";
import type {
  DecisionOptions,
  DecisionPlugin,
  DecisionPluginSetup,
  DecisionProvider,
  DecisionRule,
  ResolvedOptions,
  ResolvedRule,
} from "#/entities/decision/index.ts";
import {
  RULE_OPTIONS_SCHEMA,
  overrideRule,
  sharedFile,
  visitorFor,
} from "#/features/judge-code/index.ts";

import { cloudflare } from "./cloudflare.ts";
import { typesafe } from "./typesafe.ts";

const DEFAULT_NAME = "decision";

const metaOf = (rule: DecisionRule): RuleMeta => ({
  type: "problem",
  docs: { description: rule.question },
  schema: RULE_OPTIONS_SCHEMA,
  messages: {
    yes: "[{{id}}] {{model}} answered {{answer}} ({{score}} >= {{cutoff}}): {{question}}",
    unlocated: `${PREFIX}: {{reason}} while refining the location of [{{id}}]; the finding is reported at the file level`,
  },
});

const optionsOf = (setup: DecisionPluginSetup): DecisionOptions =>
  Struct.omit(setup, ["name", "rules"]);

type Resolve = (settings: unknown) => ResolvedOptions;

const memoized = (resolve: Resolve): Resolve => {
  const resolved = new Map<string, ResolvedOptions>();
  return (settings) => {
    const key = toJson([settings]);
    return resolved.getOrInsertComputed(key, () => resolve(settings));
  };
};

const memoizedRules = (
  providers: Readonly<Record<string, DecisionProvider>>,
): ((rule: ResolvedRule, options: unknown) => ResolvedRule) => {
  const resolved = new WeakMap<ResolvedRule, Map<string, ResolvedRule>>();
  return (rule, options) => {
    const known = resolved.getOrInsertComputed(rule, () => new Map<string, ResolvedRule>());
    const key = toJson([options]);
    return known.getOrInsertComputed(key, () => overrideRule(rule, options, providers));
  };
};

export const createDecisionPlugin = (setup: DecisionPluginSetup): DecisionPlugin => {
  const name = setup.name ?? DEFAULT_NAME;
  const providers: Readonly<Record<string, DecisionProvider>> = Rec.fromEntries(
    pipe(
      [cloudflare, typesafe],
      Arr.map((provider) => [provider.name, provider]),
    ),
  );
  const rules = checkRules(setup.rules);
  const options = optionsOf(setup);
  const resolve = memoized((settings) => resolveOptions({ options, settings }, rules, providers));
  resolve({});
  const shared = sharedFile((settings) => resolve(settings[name]), memoizedRules(providers));

  return {
    meta: { name },
    rules: Rec.fromEntries(
      pipe(
        rules,
        Arr.map((rule) => [rule.id, { meta: metaOf(rule), createOnce: visitorFor(shared, rule) }]),
      ),
    ),
  } satisfies Plugin;
};

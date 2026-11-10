import type { Plugin, RuleMeta } from "@oxlint/plugins";
import { Predicate, Array as Arr, Record as Rec, Struct, pipe } from "effect";

import { openRouter } from "./openrouter.ts";
import { PREFIX, checkRules, resolveOptions } from "./options.ts";
import { RULE_OPTIONS_SCHEMA, overrideRule } from "./override.ts";
import { toJson } from "./runtime.ts";
import type {
  DecisionOptions,
  DecisionPlugin,
  DecisionPluginSetup,
  DecisionProvider,
  DecisionRule,
  ResolvedOptions,
  ResolvedRule,
} from "./types.ts";
import { sharedFile, visitorFor } from "./visitor.ts";

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
  Struct.omit(setup, ["name", "rules", "providers"]);

type Resolve = (settings: unknown) => ResolvedOptions;

const memoized = (resolve: Resolve): Resolve => {
  const resolved = new Map<string, ResolvedOptions>();
  return (settings) => {
    const key = toJson([settings]);
    const cached = resolved.get(key);
    if (Predicate.isNotUndefined(cached)) {
      return cached;
    }
    const fresh = resolve(settings);
    resolved.set(key, fresh);
    return fresh;
  };
};

const memoizedRules = (
  providers: Readonly<Record<string, DecisionProvider>>,
): ((rule: ResolvedRule, options: unknown) => ResolvedRule) => {
  const resolved = new WeakMap<ResolvedRule, Map<string, ResolvedRule>>();
  return (rule, options) => {
    const known = resolved.get(rule) ?? new Map<string, ResolvedRule>();
    resolved.set(rule, known);
    const key = toJson([options]);
    const cached = known.get(key);
    if (Predicate.isNotUndefined(cached)) {
      return cached;
    }
    const fresh = overrideRule(rule, options, providers);
    known.set(key, fresh);
    return fresh;
  };
};

const createDecisionPlugin = (setup: DecisionPluginSetup): DecisionPlugin => {
  const name = setup.name ?? DEFAULT_NAME;
  const providers: Readonly<Record<string, DecisionProvider>> = Rec.fromEntries(
    pipe(
      [openRouter, ...(setup.providers ?? [])],
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

export { createDecisionPlugin };

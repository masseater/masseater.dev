import type { DecisionProvider, DecisionRule } from "./types.ts";

export const defineDecisionRule = <const Rule extends DecisionRule>(rule: Rule): Rule => rule;

export const defineProvider = <const Provider extends DecisionProvider>(
  provider: Provider,
): Provider => provider;

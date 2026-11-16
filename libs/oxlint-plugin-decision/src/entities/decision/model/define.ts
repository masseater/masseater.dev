import type { DecisionRule } from "./types.ts";

export const defineDecisionRule = <const Rule extends DecisionRule>(rule: Rule): Rule => rule;

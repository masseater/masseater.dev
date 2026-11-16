import { Predicate, Array as Arr, pipe } from "effect";

import { defineDecisionRule } from "#/entities/decision/index.ts";
import type { DecisionRule, RuleContext } from "#/entities/decision/index.ts";

export interface Judgement {
  readonly ask: string;
  readonly yes: string;
  readonly no: string;
  readonly note?: string | undefined;
}

export interface ClaimRule
  extends Judgement, Pick<DecisionRule, "id" | "cutoff" | "select" | "context"> {
  readonly target?: Extract<DecisionRule["target"], "function" | "call">;
}

const questionOf = ({ ask, yes, no, note }: Judgement): string =>
  pipe(
    [ask, `It is true when: ${yes}`, `It is false when: ${no}`, note],
    Arr.filter((part) => Predicate.isNotUndefined(part)),
    Arr.join("\n\n"),
  );

export const claimRule = ({ ask, yes, no, note, ...rule }: ClaimRule): DecisionRule =>
  defineDecisionRule({
    target: "function",
    ...rule,
    message: ask,
    question: questionOf({ ask, yes, no, note }),
  });

export const COMMENT: RuleContext = { scope: "comment" };
export const ENCLOSING_FUNCTION: RuleContext = { scope: "enclosing", kind: "function" };

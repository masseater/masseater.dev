import { Array as Arr, Option, String as Str, pipe } from "effect";

import { ERROR_LABEL, QUESTION_LABEL, REASON_LABEL, STRATEGY_LABEL } from "#protocol";
import { strategyOf } from "#strategies";
import type { StrategyId } from "#strategies";

type ParsedDraft = Readonly<{
  strategy: Option.Option<StrategyId>;
  reason: string;
  question: string;
  error: Option.Option<string>;
}>;

const LABELS = [STRATEGY_LABEL, REASON_LABEL, QUESTION_LABEL, ERROR_LABEL] as const;
const BODY_GROUP = 1;
const START = 0;

const sectionPattern = (label: string): RegExp =>
  new RegExp(
    String.raw`${label}\s*[:：]\s*([\s\S]*?)(?=(?:${pipe(LABELS, Arr.join("|"))})\s*[:：]|$)`,
    "u",
  );

const section = (text: string, label: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(sectionPattern(label).exec(text)),
    Option.flatMap(Arr.get(BODY_GROUP)),
    Option.map(Str.trim),
  );

const labelStartsWith =
  (text: string) =>
  (label: string): boolean =>
    Str.startsWith(Str.slice(START, label.length)(text))(label);

const startsLikeLabel = (text: string): boolean => pipe(LABELS, Arr.some(labelStartsWith(text)));

const unlabeledQuestion = (text: string): string => {
  const trimmed = Str.trim(text);
  if (startsLikeLabel(trimmed)) {
    return "";
  }
  return trimmed;
};

const parseDraft = (text: string): ParsedDraft => {
  const strategy = section(text, STRATEGY_LABEL);
  const reason = section(text, REASON_LABEL);
  const question = section(text, QUESTION_LABEL);
  const fallback = Option.match(Option.firstSomeOf([strategy, reason, question]), {
    onNone: () => unlabeledQuestion(text),
    onSome: () => "",
  });
  return {
    strategy: pipe(strategy, Option.flatMap(strategyOf)),
    reason: Option.getOrElse(reason, () => ""),
    question: Option.getOrElse(question, () => fallback),
    error: section(text, ERROR_LABEL),
  };
};

export { parseDraft };
export type { ParsedDraft };

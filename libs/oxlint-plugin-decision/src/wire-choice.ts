import {
  Array as Arr,
  Boolean as Bool,
  Number as Num,
  Option,
  Order,
  pipe,
  Record as Rec,
  String as Str,
  Function as Fn,
} from "effect";

import { SEVERITY_ORDER, noulOf } from "./answer.ts";
import { CONFIDENT } from "./schema.ts";
import type { Answers, ChoiceAnswer, ChoiceQuestion, DecisionRequest } from "./types.ts";

const DATA_FIRST_ARITY = 2;

type ChoiceCriteria = ChoiceQuestion["criteria"];

const RESPAN_MODELS = ["respan/"] as const;
const OPTION_SEPARATOR = "__";
const CERTAIN = 1;
const NO_SEVERITY = "none";

const isRespan = (model: string): boolean =>
  pipe(
    RESPAN_MODELS,
    Arr.some((prefix) => Str.startsWith(prefix)(model)),
  );

const optionIdOf: {
  (label: string): (id: string) => string;
  (id: string, label: string): string;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (id: string, label: string): string => `${id}${OPTION_SEPARATOR}${label}`,
);

const isSeverityScale = (criteria: ChoiceCriteria): boolean =>
  pipe(Rec.keys(criteria), Arr.join(",")) === pipe(SEVERITY_ORDER, Arr.join(","));

const levelsAboveNone = (criteria: ChoiceCriteria): readonly (readonly [string, string | null])[] =>
  pipe(
    Rec.toEntries(criteria),
    Arr.filter(([label]) => label !== NO_SEVERITY),
  );

interface Score {
  readonly label: string;
  readonly yes: number;
}

const byYes = Order.mapInput(Order.Number, ({ yes }: Score) => yes);

const scoreOf = (answers: Answers, id: string, label: string): Option.Option<Score> =>
  Option.map(noulOf(answers[optionIdOf(id, label)]), ({ noul }) => ({ label, yes: noul }));

const scoresOf = (
  answers: Answers,
  id: string,
  labels: readonly string[],
): Option.Option<Arr.NonEmptyReadonlyArray<Score>> =>
  pipe(
    labels,
    Arr.map((label) => scoreOf(answers, id, label)),
    Option.all,
    Option.flatMap((scores) => Option.liftPredicate(scores, Arr.isArrayNonEmpty)),
  );

const probabilitiesOf = (scores: readonly Score[]): Readonly<Record<string, number>> =>
  Rec.fromEntries(
    pipe(
      scores,
      Arr.map(({ label, yes }) => [label, yes]),
    ),
  );

const choiceAnswer = (
  choice: string,
  probabilities: Readonly<Record<string, number>>,
): ChoiceAnswer => ({
  type: "choice",
  choice,
  probabilities,
});

const bestLabel = (scores: Arr.NonEmptyReadonlyArray<Score>): ChoiceAnswer =>
  choiceAnswer(Arr.max(scores, byYes).label, probabilitiesOf(scores));

const atLeast = (scores: Arr.NonEmptyReadonlyArray<Score>): Arr.NonEmptyReadonlyArray<Score> =>
  pipe(
    scores,
    Arr.map(({ label }, index) => ({
      label,
      yes: Math.max(
        ...pipe(
          scores.slice(index),
          Arr.map(({ yes }) => yes),
        ),
      ),
    })),
  );

const severityLevel = (scores: Arr.NonEmptyReadonlyArray<Score>): ChoiceAnswer => {
  const cumulative = atLeast(scores);
  const probabilities = {
    [NO_SEVERITY]: Num.subtract(CERTAIN, Arr.headNonEmpty(cumulative).yes),
    ...probabilitiesOf(cumulative),
  };
  const reached = pipe(
    cumulative,
    Arr.findLast(({ yes }) => yes >= CONFIDENT),
  );
  return choiceAnswer(
    Option.match(reached, { onNone: () => NO_SEVERITY, onSome: ({ label }) => label }),
    probabilities,
  );
};

const labelsAsked = (criteria: ChoiceCriteria): readonly string[] => {
  if (isSeverityScale(criteria)) {
    return pipe(
      levelsAboveNone(criteria),
      Arr.map(([label]) => label),
    );
  }
  return Rec.keys(criteria);
};

const choiceFromYesNo = (
  answers: Answers,
  [id, { criteria }]: readonly [string, ChoiceQuestion],
): readonly (readonly [string, ChoiceAnswer])[] => {
  const collapse = Bool.match(isSeverityScale(criteria), {
    onTrue: () => severityLevel,
    onFalse: () => bestLabel,
  });
  return scoresOf(answers, id, labelsAsked(criteria)).pipe(
    Option.map((scores) => [id, collapse(scores)] as const),
    Option.toArray,
  );
};

const choiceQuestionsOf = (
  request: DecisionRequest,
): readonly (readonly [string, ChoiceQuestion])[] =>
  pipe(
    Rec.toEntries(request.questions),
    Arr.flatMap(([id, question]) => {
      if (question.type === "choice") {
        return [[id, question] as const];
      }
      return [];
    }),
  );

const withChoices: {
  (answers: Answers): (request: DecisionRequest) => Answers;
  (request: DecisionRequest, answers: Answers): Answers;
} = Fn.dual(DATA_FIRST_ARITY, (request: DecisionRequest, answers: Answers): Answers => {
  if (!isRespan(request.model)) {
    return answers;
  }
  return {
    ...answers,
    ...Rec.fromEntries(
      pipe(
        choiceQuestionsOf(request),
        Arr.flatMap((entry) => choiceFromYesNo(answers, entry)),
      ),
    ),
  };
});

export { isRespan, isSeverityScale, levelsAboveNone, optionIdOf, withChoices };
export type { ChoiceCriteria };

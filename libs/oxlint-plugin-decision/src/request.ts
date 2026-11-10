import {
  Array as Arr,
  Boolean as Bool,
  Number as Num,
  Option,
  Predicate,
  String as Str,
  Record as Rec,
  pipe,
  Function as Fn,
} from "effect";

import { questionFor, verdictOf } from "./answer.ts";
import {
  EVERY_LINE,
  locates,
  locationCandidates,
  locationQuestion,
  numberedLines,
  validChoice,
} from "./location.ts";
import type { ChoiceCriteria } from "./location.ts";
import type {
  Answers,
  DecisionRequest,
  DecisionResponse,
  Question,
  RequestMatch,
  Verdict,
  Verdicts,
} from "./types.ts";

const DATA_FIRST_ARITY = 2;

const FIRST_LINE = 1;
const LOCATION_SUFFIX = "_location";
const TRUNCATION_MARKER = "/* ...truncated */";

const refAt = (index: number): string => `s${String(index)}`;

const locationRefOf = (ref: string): string => `${ref}${LOCATION_SUFFIX}`;

const snippetRefOf = (questionId: string): string =>
  Bool.match(Str.endsWith(LOCATION_SUFFIX)(questionId), {
    onTrue: () => Str.slice(Num.decrement(FIRST_LINE), -LOCATION_SUFFIX.length)(questionId),
    onFalse: () => questionId,
  });

const truncateSnippet: {
  (maxChars: number): (text: string) => string;
  (text: string, maxChars: number): string;
} = Fn.dual(DATA_FIRST_ARITY, (text: string, maxChars: number): string =>
  Bool.match(text.length <= maxChars, {
    onTrue: () => text,
    onFalse: () => `${Str.slice(Num.decrement(FIRST_LINE), maxChars)(text)}${TRUNCATION_MARKER}`,
  }),
);

const numbered = (snippet: string): string =>
  pipe(
    numberedLines(snippet),
    Arr.map(({ text, line }) => `L${String(line)}| ${text}`),
    Arr.join("\n"),
  );

const contextNote = (match: RequestMatch, ref: string): string => {
  if (Predicate.isUndefined(match.context)) {
    return "";
  }
  return ` state.contexts.${ref} shows the source around it; use it only to understand the snippet.`;
};

const mainQuestionFor = (match: RequestMatch, ref: string): readonly [string, Question] => [
  ref,
  questionFor(
    match.rule.answer,
    `Consider only snippet "${ref}" in state.snippets.${contextNote(match, ref)} ${match.rule.question}`,
  ),
];

const questionsFor = (
  match: RequestMatch,
  ref: string,
): readonly (readonly [string, Question])[] => {
  if (!locates(match)) {
    return [mainQuestionFor(match, ref)];
  }
  return [
    mainQuestionFor(match, ref),
    [
      locationRefOf(ref),
      locationQuestion(match, ref, locationCandidates(match.snippet, EVERY_LINE)),
    ],
  ];
};

const snippetFor = (match: RequestMatch): string => {
  if (locates(match)) {
    return numbered(match.snippet);
  }
  return match.snippet;
};

const contextsOf = (
  matches: readonly RequestMatch[],
): Readonly<{ contexts?: Readonly<Record<string, string>> }> => {
  const contexts = pipe(
    matches,
    Arr.flatMap((match, index) =>
      Option.toArray(
        Option.map(Option.fromUndefinedOr(match.context), (text) => [refAt(index), text] as const),
      ),
    ),
  );
  if (Arr.isReadonlyArrayEmpty(contexts)) {
    return {};
  }
  return { contexts: Rec.fromEntries(contexts) };
};

const buildRequest: {
  (matches: readonly RequestMatch[]): (model: string) => DecisionRequest;
  (model: string, matches: readonly RequestMatch[]): DecisionRequest;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (model: string, matches: readonly RequestMatch[]): DecisionRequest => ({
    model,
    state: {
      snippets: Rec.fromEntries(
        pipe(
          matches,
          Arr.map((match, index) => [refAt(index), snippetFor(match)]),
        ),
      ),
      ...contextsOf(matches),
    },
    questions: Rec.fromEntries(
      pipe(
        matches,
        Arr.flatMap((match, index) => questionsFor(match, refAt(index))),
      ),
    ),
  }),
);

const choiceQuestionsOf = (
  request: DecisionRequest,
): readonly (readonly [string, ChoiceCriteria])[] =>
  pipe(
    Rec.toEntries(request.questions),
    Arr.flatMap(([id, question]) => {
      if (question.type === "choice") {
        return [[id, question.criteria] as const];
      }
      return [];
    }),
  );

const mainQuestionsOf = (request: DecisionRequest): readonly (readonly [string, Question])[] =>
  pipe(
    Rec.toEntries(request.questions),
    Arr.filter(([id]) => !Str.endsWith(LOCATION_SUFFIX)(id)),
  );

const resultOf = (
  answers: Answers,
  [ref, question]: readonly [string, Question],
): readonly [string, Verdict] => [
  ref,
  Option.getOrThrowWith(
    verdictOf(question, answers[ref]),
    () => new Error(`response has no valid answer for "${ref}"`),
  ),
];

const parseVerdicts: {
  (request: DecisionRequest): (response: DecisionResponse) => Verdicts;
  (response: DecisionResponse, request: DecisionRequest): Verdicts;
} = Fn.dual(DATA_FIRST_ARITY, (response: DecisionResponse, request: DecisionRequest): Verdicts => {
  const { model, answers } = Option.getOrThrowWith(
    Option.liftPredicate(response, ({ model: served }) => Str.isNonEmpty(served)),
    () => new Error("response has no model id"),
  );
  const results = Rec.fromEntries(
    pipe(
      mainQuestionsOf(request),
      Arr.map((entry) => resultOf(answers, entry)),
    ),
  );
  const complete = pipe(
    choiceQuestionsOf(request),
    Arr.every(([id, criteria]) => validChoice(answers[id], criteria)),
  );
  return { model, results, answers, complete };
});

export { buildRequest, locationRefOf, parseVerdicts, refAt, snippetRefOf, truncateSnippet };

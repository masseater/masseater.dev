import {
  Array as Arr,
  Boolean as Bool,
  Option,
  Record as Rec,
  String as Str,
  pipe,
  Function as Fn,
} from "effect";

import { LOCATION_SUFFIX } from "./mock-body.ts";
import type { Body, Question } from "./mock-body.ts";

const DATA_FIRST_ARITY_3 = 3;

const PII_MARKER = "user.email, user.phone";

const MARKER_BY_QUESTION: Readonly<Record<string, string>> = {
  "personal data": PII_MARKER,
  "reading or fetching data": "loaded",
  "language model": String.raw`refunds.\n\n`,
};

const YES = 0.95;
const NO = 0.05;
const SURE = 0.99;
const UNSURE = 0.6;
const NO_HITS = 0;
const FIRST_HIT = 1;
const SECOND_HIT = 2;
const UNKNOWN_CHOICE = "unknown";
const OPTION_SEPARATOR = "__";

const YES_BY_FLAGGED_OPTION: Readonly<Record<string, number>> = {
  leaks: 0.9,
  safe: 0.3,
  info: 0.97,
  warn: 0.93,
  error: 0.85,
};
const LOCATED_LINE = /^L(?<line>\d+)\|/u;
const RANGE_KEY = /^L(?<start>\d+)(?:-L(?<end>\d+))?$/u;
const lookup = <Value>(
  record: Readonly<Record<string, Value>>,
  key: string,
): Option.Option<Value> => Option.fromUndefinedOr(record[key]);

const snippetOf = (body: Body, ref: string): string =>
  Option.getOrElse(lookup(body.state.snippets, ref), () => "");

const scoreFor = (question: string, snippet: string): number =>
  Arr.findFirst(Rec.toEntries(MARKER_BY_QUESTION), ([topic]) => Str.includes(topic)(question)).pipe(
    Option.filter(([, marker]) => Str.includes(marker)(snippet)),
    Option.match({ onNone: () => NO, onSome: () => YES }),
  );

const isRefinement = (body: Body): boolean =>
  pipe(
    Rec.keys(body.questions),
    Arr.every((ref) => Str.endsWith(LOCATION_SUFFIX)(ref)),
  );

const markedLine = (snippet: string): number =>
  Arr.findFirst(Str.split(snippet, "\n"), (text) => Str.includes(PII_MARKER)(text)).pipe(
    Option.flatMap((text) => Option.fromNullishOr(LOCATED_LINE.exec(text))),
    Option.flatMap((found) => Option.fromUndefinedOr(found.groups)),
    Option.flatMap((groups) => lookup(groups, "line")),
    Option.match({ onNone: () => Number.NaN, onSome: Number }),
  );

const keyContains = (key: string, line: number): boolean =>
  Option.fromNullishOr(RANGE_KEY.exec(key)).pipe(
    Option.flatMap((found) => Option.fromUndefinedOr(found.groups)),
    Option.exists((groups) => {
      const start = Number(groups["start"]);
      const end = Number(Option.getOrElse(lookup(groups, "end"), () => groups["start"]));
      return start <= line && line <= end;
    }),
  );

const selectedChoice = (body: Body, ref: string, token: string): string => {
  if (token === "location-unknown") {
    return UNKNOWN_CHOICE;
  }
  const line = markedLine(snippetOf(body, Str.replace(LOCATION_SUFFIX, "")(ref)));
  return lookup(body.questions, ref).pipe(
    Option.flatMap((question) => Option.fromUndefinedOr(question.criteria)),
    Option.flatMap((criteria) =>
      Arr.findFirst(Rec.keys(criteria), (key) => keyContains(key, line)),
    ),
    Option.getOrElse(() => UNKNOWN_CHOICE),
  );
};

const choiceAnswer = (body: Body, ref: string, token: string): unknown => {
  const choice = selectedChoice(body, ref, token);
  let probability = SURE;
  if (token === "location-uncertain") {
    probability = UNSURE;
  }
  return { type: "choice", choice, probabilities: { [choice]: probability } };
};

const optionOf = (ref: string): Option.Option<readonly [string, string]> => {
  const [snippetRef, option] = Str.split(ref, OPTION_SEPARATOR);
  return Option.map(Option.fromUndefinedOr(option), (label) => [snippetRef, label] as const);
};

const optionScore = (flagged: boolean, label: string): number =>
  Bool.match(flagged, {
    onTrue: () => Option.getOrElse(lookup(YES_BY_FLAGGED_OPTION, label), () => NO),
    onFalse: () => NO,
  });

const noulScore = (body: Body, ref: string, token: string): number => {
  if (token === "location-always-positive") {
    return SURE;
  }
  if (token === "location-no-violation") {
    return NO;
  }
  const instructions = lookup(body.questions, ref).pipe(
    Option.match({ onNone: () => "", onSome: (question) => question.instructions }),
  );
  return Option.match(optionOf(ref), {
    onNone: () => scoreFor(instructions, snippetOf(body, ref)),
    onSome: ([snippetRef, label]) =>
      optionScore(scoreFor(instructions, snippetOf(body, snippetRef)) === YES, label),
  });
};

const skipsChoice = (body: Body, token: string, hits: number): boolean =>
  (token === "location-missing-once" && hits === FIRST_HIT) ||
  (token === "refinement-missing-once" && isRefinement(body) && hits === SECOND_HIT);

const labelAnswer = (body: Body, ref: string, question: Question): unknown => {
  const labels = Rec.keys(Option.getOrElse(Option.fromUndefinedOr(question.criteria), () => ({})));
  const flagged = scoreFor(question.instructions, snippetOf(body, ref)) === YES;
  const choice = Option.getOrElse(
    Bool.match(flagged, { onTrue: () => Arr.last(labels), onFalse: () => Arr.head(labels) }),
    () => UNKNOWN_CHOICE,
  );
  return { type: "choice", choice, probabilities: { [choice]: SURE } };
};

const answerOf =
  (body: Body, token: string, hits: number) =>
  ([ref, question]: readonly [string, Body["questions"][string]]): readonly [string, unknown][] => {
    if (question.type !== "choice") {
      return [[ref, { type: "noul", noul: noulScore(body, ref, token) }]];
    }
    if (!Str.endsWith(LOCATION_SUFFIX)(ref)) {
      return [[ref, labelAnswer(body, ref, question)]];
    }
    if (skipsChoice(body, token, hits)) {
      return [];
    }
    return [[ref, choiceAnswer(body, ref, token)]];
  };

const answer: {
  (token: string, hits: number): (body: Body) => unknown;
  (body: Body, token: string, hits: number): unknown;
} = Fn.dual(DATA_FIRST_ARITY_3, (body: Body, token: string, hits: number): unknown => {
  const answers = Rec.fromEntries(
    pipe(
      Rec.toEntries(body.questions),
      Arr.flatMap((entry) => answerOf(body, token, hits)(entry)),
    ),
  );
  let model = "mock-decider";
  if (body.model === "second") {
    model = "mock-second";
  }
  return {
    model,
    answers,
    usage: { input_tokens: NO_HITS, output_tokens: NO_HITS, cost: NO_HITS },
  };
});

export { FIRST_HIT, NO_HITS, answer, isRefinement };

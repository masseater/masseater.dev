import type { Location } from "@oxlint/plugins";
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

import { choiceOf, probabilityOfChoice } from "./answer.ts";
import type { Answer, ChoiceQuestion, LineRange, RequestMatch, RuleLocation } from "./types.ts";

const DATA_FIRST_ARITY = 2;
const DATA_FIRST_ARITY_3 = 3;
const CHOICE_OPTION_LIMIT = 254;
const FIRST_LINE = 1;
const MINIMUM_WIDTH = 1;
const UNKNOWN_CHOICE = "unknown";

const sourceLines = (text: string): readonly string[] =>
  Str.split(text, /\r\n|[\n\r\u2028\u2029]/u);

type LocatedMatch = RequestMatch & {
  readonly rule: { readonly question: string; readonly location: RuleLocation };
};

const locates = (match: RequestMatch): match is LocatedMatch =>
  Predicate.isNotUndefined(match.rule.location) && !match.truncated;

interface NumberedLine {
  readonly text: string;
  readonly line: number;
}

const EVERY_LINE: LineRange = { start: FIRST_LINE, end: Number.POSITIVE_INFINITY };

const isWithin = (line: number, within: LineRange): boolean =>
  Num.between(line, { minimum: within.start, maximum: within.end });

const rangeKey = ({ start, end }: LineRange): string =>
  Bool.match(start === end, {
    onTrue: () => `L${String(start)}`,
    onFalse: () => `L${String(start)}-L${String(end)}`,
  });

const rangeLabel = ({ start, end }: LineRange): string =>
  Bool.match(start === end, {
    onTrue: () => `Line ${String(start)}`,
    onFalse: () => `Lines ${String(start)} to ${String(end)}`,
  });

const rangeOf = (group: Arr.NonEmptyReadonlyArray<NumberedLine>): LineRange => ({
  start: Arr.headNonEmpty(group).line,
  end: Arr.lastNonEmpty(group).line,
});

const numberedLines = (snippet: string): readonly NumberedLine[] =>
  pipe(
    sourceLines(snippet),
    Arr.map((text, index) => ({ text, line: Num.sum(index, FIRST_LINE) })),
  );

const locationCandidates: {
  (within: LineRange): (snippet: string) => Readonly<Record<string, LineRange>>;
  (snippet: string, within: LineRange): Readonly<Record<string, LineRange>>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (snippet: string, within: LineRange): Readonly<Record<string, LineRange>> => {
    const lines = pipe(
      numberedLines(snippet),
      Arr.filter(({ text, line }) => Str.trim(text).length >= FIRST_LINE && isWithin(line, within)),
    );
    const width = Math.max(MINIMUM_WIDTH, Math.ceil(lines.length / CHOICE_OPTION_LIMIT));
    return Rec.fromEntries(
      pipe(
        Arr.chunksOf(lines, width),
        Arr.map((group) => {
          const range = rangeOf(group);
          return [rangeKey(range), range];
        }),
      ),
    );
  },
);

const locationQuestion: {
  (
    ref: string,
    candidates: Readonly<Record<string, LineRange>>,
  ): (match: LocatedMatch) => ChoiceQuestion;
  (
    match: LocatedMatch,
    ref: string,
    candidates: Readonly<Record<string, LineRange>>,
  ): ChoiceQuestion;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    match: LocatedMatch,
    ref: string,
    candidates: Readonly<Record<string, LineRange>>,
  ): ChoiceQuestion => ({
    type: "choice",
    instructions: `Consider only the numbered source in state.snippets.${ref}. If it violates this rule, select the line (or range containing that line) to annotate. Rule: ${match.rule.question} Location: ${match.rule.location.question} If multiple violations exist, select the earliest one. Select ${UNKNOWN_CHOICE} if no violation exists or its location is unclear.`,
    criteria: {
      ...Rec.fromEntries(
        pipe(
          Rec.toEntries(candidates),
          Arr.map(([key, range]) => [key, rangeLabel(range)]),
        ),
      ),
      [UNKNOWN_CHOICE]: "No clear source location for this violation",
    },
  }),
);

type ChoiceCriteria = ChoiceQuestion["criteria"];

const validChoice: {
  (criteria: ChoiceCriteria): (answer: Answer | undefined) => boolean;
  (answer: Answer | undefined, criteria: ChoiceCriteria): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (answer: Answer | undefined, criteria: ChoiceCriteria): boolean =>
  Option.exists(
    choiceOf(answer),
    (chosen) => Rec.has(criteria, chosen.choice) && Option.isSome(probabilityOfChoice(chosen)),
  ),
);

const selectedLocation: {
  (
    candidates: Readonly<Record<string, LineRange>>,
    cutoff: number,
  ): (answer: Answer | undefined) => Option.Option<LineRange>;
  (
    answer: Answer | undefined,
    candidates: Readonly<Record<string, LineRange>>,
    cutoff: number,
  ): Option.Option<LineRange>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    answer: Answer | undefined,
    candidates: Readonly<Record<string, LineRange>>,
    cutoff: number,
  ): Option.Option<LineRange> =>
    choiceOf(answer).pipe(
      Option.filter((chosen) =>
        Option.exists(probabilityOfChoice(chosen), (probability) =>
          Num.isGreaterThanOrEqualTo(probability, cutoff),
        ),
      ),
      Option.flatMap(({ choice }) => Option.fromUndefinedOr(candidates[choice])),
    ),
);

const locationOfLine: {
  (line: number): (snippet: string) => Location;
  (snippet: string, line: number): Location;
} = Fn.dual(DATA_FIRST_ARITY, (snippet: string, line: number): Location => {
  const text = Option.getOrElse(Arr.get(sourceLines(snippet), Num.decrement(line)), () => "");
  return {
    start: {
      line,
      column: Option.getOrElse(Str.search(/\S/u)(text), () => Num.decrement(FIRST_LINE)),
    },
    end: { line, column: Str.trimEnd(text).length },
  };
});

export {
  EVERY_LINE,
  locates,
  locationCandidates,
  locationOfLine,
  locationQuestion,
  numberedLines,
  selectedLocation,
  sourceLines,
  validChoice,
};
export type { ChoiceCriteria, LocatedMatch, NumberedLine };

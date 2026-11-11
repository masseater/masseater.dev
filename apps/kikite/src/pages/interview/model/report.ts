import { Array as Arr, Number as Num, Option, Order, pipe } from "effect";

import { STRATEGY_IDS } from "#strategies";
import type { StrategyId } from "#strategies";

import type { Entry, Progress } from "./atoms.ts";

type QuestionEntry = Extract<Entry, { kind: "question" }>;

type StrategyRow = Readonly<{
  strategy: StrategyId;
  asked: number;
  good: number;
  off: number;
}>;

type Wait = Readonly<{ medianMs: number; maxMs: number }>;

type Change = Readonly<{ open: readonly [number, number]; next: readonly [number, number] }>;

type Report = Readonly<{
  rows: readonly StrategyRow[];
  wait: Option.Option<Wait>;
  withdrawn: number;
  change: Option.Option<Change>;
}>;

type Sources = Readonly<{
  entries: readonly Entry[];
  progress: readonly Progress[];
  withdrawn: number;
}>;

const HALF = 2;
const NONE = 0;
const PREVIOUS = 1;

const isQuestion = (entry: Entry): entry is QuestionEntry => entry.kind === "question";

const countOf =
  <Item>(keep: (item: Item) => boolean) =>
  (items: readonly Item[]): number =>
    pipe(items, Arr.filter(keep), Arr.length);

const rowOf =
  (questions: readonly QuestionEntry[]) =>
  (strategy: StrategyId): StrategyRow => {
    const mine = pipe(
      questions,
      Arr.filter((question) => Option.contains(question.strategy, strategy)),
    );
    return {
      strategy,
      asked: mine.length,
      good: countOf((question: QuestionEntry) => question.rating === "good")(mine),
      off: countOf((question: QuestionEntry) => question.rating === "off")(mine),
    };
  };

const used = (row: StrategyRow): boolean => row.asked > NONE;

const waitAfter =
  (entries: readonly Entry[]) =>
  (question: QuestionEntry): Option.Option<number> =>
    pipe(
      Arr.get(entries, question.id - PREVIOUS),
      Option.filter((previous) => previous.kind === "speech"),
      Option.map((previous) => question.at - previous.at),
    );

const medianOf = (sorted: Arr.NonEmptyReadonlyArray<number>): number =>
  Arr.getUnsafe(sorted, Math.floor(sorted.length / HALF));

const waitOf = (
  entries: readonly Entry[],
  questions: readonly QuestionEntry[],
): Option.Option<Wait> =>
  pipe(
    questions,
    Arr.map(waitAfter(entries)),
    Arr.getSomes,
    Arr.sortBy(Num.Order),
    Arr.match({
      onEmpty: Option.none<Wait>,
      onNonEmpty: (sorted) =>
        Option.some({ medianMs: medianOf(sorted), maxMs: Arr.lastNonEmpty(sorted) }),
    }),
  );

const changeOf = (progress: readonly Progress[]): Option.Option<Change> =>
  pipe(
    Option.all([Arr.head(progress), Arr.last(progress)]),
    Option.map(([first, last]) => ({
      open: [first.open, last.open] as const,
      next: [first.next, last.next] as const,
    })),
  );

const byAsked = Order.mapInput(Order.flip(Num.Order), (row: StrategyRow) => row.asked);

const reportOf = ({ entries, progress, withdrawn }: Sources): Report => {
  const questions = pipe(entries, Arr.filter(isQuestion));
  return {
    rows: pipe(STRATEGY_IDS, Arr.map(rowOf(questions)), Arr.filter(used), Arr.sortBy(byAsked)),
    wait: waitOf(entries, questions),
    withdrawn,
    change: changeOf(progress),
  };
};

/** @internal */
export { reportOf };
export type { Change, Report, StrategyRow, Wait };

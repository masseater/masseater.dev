import { Array as Arr, Match, Option, Result, Schema, pipe } from "effect";

const SignedAmount = Schema.Struct({
  kind: Schema.Literal("signed"),
  column: Schema.NonEmptyString.annotate({ description: "金額の列の見出し" }),
  outflowPositive: Schema.Boolean.annotate({
    description:
      "true なら正の数を出金（カードの利用明細の多く）、false なら正の数を入金として読む",
  }),
});

const SplitAmount = Schema.Struct({
  kind: Schema.Literal("split"),
  outflow: Schema.NonEmptyString.annotate({
    description: "出金（お支払金額・引出し）の列の見出し",
  }),
  inflow: Schema.NonEmptyString.annotate({ description: "入金（お預入れ金額）の列の見出し" }),
});

const DescriptionColumns = Schema.NonEmptyArray(Schema.NonEmptyString).annotate({
  description: "摘要として空白でつなぐ列の見出し。先の列ほど前に置く",
});

const MemoColumn = Schema.NonEmptyString.annotate({ description: "メモの列の見出し" });

export const ColumnsSchema = Schema.Struct({
  date: Schema.NonEmptyString.annotate({ description: "日付の列の見出し" }),
  description: DescriptionColumns,
  memo: Schema.optionalKey(MemoColumn),
  amount: Schema.Union([SignedAmount, SplitAmount]),
});

export type Columns = typeof ColumnsSchema.Type;

export type AmountIndexes =
  | Readonly<{ kind: "signed"; index: number; outflowPositive: boolean }>
  | Readonly<{ kind: "split"; outflow: number; inflow: number }>;

export type Indexes = Readonly<{
  date: number;
  description: readonly number[];
  memo: Option.Option<number>;
  amount: AmountIndexes;
}>;

export type Lookup = (name: string) => Result.Result<number, string>;

const amountIndexes = (
  amount: Columns["amount"],
  lookup: Lookup,
): Result.Result<AmountIndexes, string> =>
  Match.value(amount).pipe(
    Match.discriminatorsExhaustive("kind")({
      signed: ({ column, outflowPositive }) =>
        pipe(
          lookup(column),
          Result.map((index): AmountIndexes => ({ kind: "signed", index, outflowPositive })),
        ),
      split: ({ outflow, inflow }) =>
        pipe(
          Result.all([lookup(outflow), lookup(inflow)]),
          Result.map(([out, into]): AmountIndexes => ({
            kind: "split",
            outflow: out,
            inflow: into,
          })),
        ),
    }),
  );

const memoIndex = (
  memo: Columns["memo"],
  lookup: Lookup,
): Result.Result<Option.Option<number>, string> =>
  Option.match(Option.fromUndefinedOr(memo), {
    onNone: () => Result.succeed(Option.none()),
    onSome: (name) => pipe(lookup(name), Result.map(Option.some)),
  });

export const indexesOf = ({
  columns,
  lookup,
}: Readonly<{ columns: Columns; lookup: Lookup }>): Result.Result<Indexes, string> =>
  Result.gen(function* indexes() {
    const date = yield* lookup(columns.date);
    const description = yield* Result.all(pipe(columns.description, Arr.map(lookup)));
    const memo = yield* memoIndex(columns.memo, lookup);
    const amount = yield* amountIndexes(columns.amount, lookup);
    return { date, description, memo, amount };
  });

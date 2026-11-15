import { Array as Arr, Match, Option, Result, Schema, String as Str, pipe } from "effect";
import { parse } from "papaparse";

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

const AmountColumns = Schema.Union([SignedAmount, SplitAmount]);

const Columns = Schema.Struct({
  date: Schema.NonEmptyString.annotate({ description: "日付の列の見出し" }),
  description: Schema.NonEmptyArray(Schema.NonEmptyString).annotate({
    description: "摘要として空白でつなぐ列の見出し。先の列ほど前に置く",
  }),
  memo: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: "メモの列の見出し" })),
  amount: AmountColumns,
});

type Columns = typeof Columns.Type;

type CsvLayout = Readonly<{ headerRow: number; columns: Columns }>;

type ParsedRow = Readonly<{
  line: number;
  date: string;
  amount: number;
  description: string;
  memo: string | null;
}>;

type Parsed = Readonly<{ rows: readonly ParsedRow[]; skipped: readonly number[] }>;

type Cells = readonly string[];

type Lookup = (name: string) => Result.Result<number, string>;

const DATE_PARTS = /^(?<year>\d{4})[/.\-年](?<month>\d{1,2})[/.\-月](?<day>\d{1,2})日?$/u;

const COMPACT_DATE = /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})$/u;

const INTEGER = /^-?\d+$/u;

const MINUS_MARKS = /^[▲△]/u;

const NOISE = /[\s,¥\\円]/gu;

const FIRST_LINE = 1;

const DECIMAL = 10;

const MONTH_OFFSET = 1;

const PAD = 2;

const clean = (cell: string): string => cell.normalize("NFKC").trim();

const padded = (value: number): string => String(value).padStart(PAD, "0");

const dateOf = (cell: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(DATE_PARTS.exec(cell)?.groups ?? COMPACT_DATE.exec(cell)?.groups),
    Option.map(({ year, month, day }) => ({
      year: Number.parseInt(year ?? "", DECIMAL),
      month: Number.parseInt(month ?? "", DECIMAL),
      day: Number.parseInt(day ?? "", DECIMAL),
    })),
    Option.filter(({ year, month, day }) => {
      const date = new Date(Date.UTC(year, month - MONTH_OFFSET, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - MONTH_OFFSET &&
        date.getUTCDate() === day
      );
    }),
    Option.map(({ year, month, day }) => `${year}-${padded(month)}-${padded(day)}`),
  );

const amountOf = (cell: string): Option.Option<number> => {
  const negative = MINUS_MARKS.test(cell);
  const digits = pipe(cell, Str.replace(MINUS_MARKS, ""), Str.replaceAll(NOISE, ""));
  return pipe(
    Option.some(digits),
    Option.filter((text) => INTEGER.test(text)),
    Option.map((text) => Number.parseInt(text, DECIMAL)),
    Option.map((value) => (negative ? -value : value)),
  );
};

const optionalAmountOf = (cell: string): Option.Option<number> =>
  Str.isEmpty(cell) ? Option.some(0) : amountOf(cell);

const lookupIn =
  (header: Cells): Lookup =>
  (name) =>
    pipe(
      Arr.findFirstIndex(header, (cell) => cell === clean(name)),
      Result.fromOption(
        () => `列「${name}」が見出しにありません。見出しは ${Arr.join(header, " / ")} です`,
      ),
    );

const cellAt = (cells: Cells, index: number): string => clean(cells[index] ?? "");

type Reader = (cells: Cells, line: number) => Result.Result<Option.Option<ParsedRow>, string>;

const readerOf = (columns: Columns, lookup: Lookup): Result.Result<Reader, string> =>
  Result.gen(function* reader() {
    const date = yield* lookup(columns.date);
    const description = yield* Result.all(Arr.map(columns.description, lookup));
    const memo = yield* pipe(
      Option.fromNullishOr(columns.memo),
      Option.match({
        onNone: () => Result.succeed(Option.none<number>()),
        onSome: (name) => Result.map(lookup(name), Option.some),
      }),
    );
    const amount = yield* Match.value(columns.amount).pipe(
      Match.discriminatorsExhaustive("kind")({
        signed: ({ column, outflowPositive }) =>
          Result.map(
            lookup(column),
            (index) => (cells: Cells) =>
              Option.map(amountOf(cellAt(cells, index)), (value) =>
                outflowPositive ? -value : value,
              ),
          ),
        split: ({ outflow, inflow }) =>
          Result.all([lookup(outflow), lookup(inflow)]).pipe(
            Result.map(
              ([out, into]) =>
                (cells: Cells) =>
                  Option.all([
                    optionalAmountOf(cellAt(cells, out)),
                    optionalAmountOf(cellAt(cells, into)),
                  ]).pipe(Option.map(([spent, received]) => received - spent)),
            ),
          ),
      }),
    );
    return (cells: Cells, line: number) => {
      const dateCell = cellAt(cells, date);
      if (Str.isEmpty(dateCell)) {
        return Result.succeed(Option.none());
      }
      return Result.gen(function* row() {
        const day = yield* Result.fromOption(
          dateOf(dateCell),
          () => `${line} 行目の日付「${dateCell}」を読めません`,
        );
        const value = yield* Result.fromOption(
          amount(cells),
          () => `${line} 行目の金額を読めません`,
        );
        const text = pipe(
          description,
          Arr.map((index) => cellAt(cells, index)),
          Arr.filter(Str.isNonEmpty),
          Arr.join(" "),
        );
        const note = pipe(
          memo,
          Option.map((index) => cellAt(cells, index)),
          Option.filter(Str.isNonEmpty),
          Option.getOrNull,
        );
        return value === 0
          ? Option.none()
          : Option.some({ line, date: day, amount: value, description: text, memo: note });
      });
    };
  });

const parseCsv = (csv: string, { headerRow, columns }: CsvLayout): Result.Result<Parsed, string> =>
  Result.gen(function* parsed() {
    const { data } = parse<string[]>(csv.replace(/^﻿/u, ""), { skipEmptyLines: false });
    const header = yield* Result.fromOption(
      Arr.get(data, headerRow - FIRST_LINE),
      () => `${headerRow} 行目に見出しがありません`,
    );
    const read = yield* readerOf(columns, lookupIn(Arr.map(header, clean)));
    const body = pipe(
      data,
      Arr.map((cells, index) => ({ cells, line: index + FIRST_LINE })),
      Arr.drop(headerRow),
      Arr.filter(({ cells }) => Arr.some(cells, (cell) => Str.isNonEmpty(clean(cell)))),
    );
    const results = yield* Result.all(Arr.map(body, ({ cells, line }) => read(cells, line)));
    return {
      rows: Arr.getSomes(results),
      skipped: pipe(
        Arr.zip(body, results),
        Arr.filter(([, result]) => Option.isNone(result)),
        Arr.map(([{ line }]) => line),
      ),
    };
  });

export { Columns, parseCsv };
export type { CsvLayout, Parsed, ParsedRow };

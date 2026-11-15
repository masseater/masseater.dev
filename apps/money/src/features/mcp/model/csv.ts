import { Array as Arr, Match, Option, Result, String as Str, pipe } from "effect";
import { parse } from "papaparse";

import { amountOf, clean, dateOf, optionalAmountOf } from "#/features/mcp/model/csv-cells";
import { indexesOf } from "#/features/mcp/model/csv-columns";
import type { AmountIndexes, Columns, Indexes, Lookup } from "#/features/mcp/model/csv-columns";

export type CsvLayout = Readonly<{ csv: string; headerRow: number; columns: Columns }>;

export type ParsedRow = Readonly<{
  line: number;
  date: string;
  amount: number;
  description: string;
  memo: Option.Option<string>;
}>;

export type Parsed = Readonly<{ rows: readonly ParsedRow[]; skipped: readonly number[] }>;

type Cells = readonly string[];

type Line = Readonly<{ cells: Cells; line: number }>;

const FIRST_LINE = 1;

const ZERO = 0;

const cellAt =
  (cells: Cells) =>
  (index: number): string =>
    clean(cells[index] ?? "");

const lookupIn =
  (header: Cells): Lookup =>
  (name) =>
    pipe(
      header,
      Arr.findFirstIndex((cell) => cell === clean(name)),
      Result.fromOption(
        () => `列「${name}」が見出しにありません。見出しは ${Arr.join(header, " / ")} です`,
      ),
    );

const signedOf = (outflowPositive: boolean): number =>
  Match.value(outflowPositive).pipe(
    Match.when(true, () => -FIRST_LINE),
    Match.orElse(() => FIRST_LINE),
  );

const signedAmount = (
  cells: Cells,
  { index, outflowPositive }: Extract<AmountIndexes, { kind: "signed" }>,
): Option.Option<number> =>
  pipe(
    amountOf(cellAt(cells)(index)),
    Option.map((value) => value * signedOf(outflowPositive)),
  );

const splitAmount = (
  cells: Cells,
  { outflow, inflow }: Extract<AmountIndexes, { kind: "split" }>,
): Option.Option<number> => {
  const cell = cellAt(cells);
  const spent = optionalAmountOf(cell(outflow));
  const received = optionalAmountOf(cell(inflow));
  return pipe(
    Option.all([spent, received]),
    Option.map(([out, into]) => into - out),
  );
};

const amountIn = (cells: Cells, amount: AmountIndexes): Option.Option<number> =>
  Match.value(amount).pipe(
    Match.discriminatorsExhaustive("kind")({
      signed: (indexes) => signedAmount(cells, indexes),
      split: (indexes) => splitAmount(cells, indexes),
    }),
  );

const textIn = (
  cells: Cells,
  indexes: Indexes,
): Readonly<{ description: string; memo: Option.Option<string> }> => ({
  description: pipe(
    indexes.description,
    Arr.map(cellAt(cells)),
    Arr.filter(Str.isNonEmpty),
    Arr.join(" "),
  ),
  memo: pipe(indexes.memo, Option.map(cellAt(cells)), Option.filter(Str.isNonEmpty)),
});

const datedRow = (
  { cells, line }: Line,
  indexes: Indexes,
  dateCell: string,
): Result.Result<Option.Option<ParsedRow>, string> =>
  Result.gen(function* row() {
    const date = yield* Result.fromOption(
      dateOf(dateCell),
      () => `${line} 行目の日付「${dateCell}」を読めません`,
    );
    const amount = yield* Result.fromOption(
      amountIn(cells, indexes.amount),
      () => `${line} 行目の金額を読めません`,
    );
    return pipe(
      Option.liftPredicate(amount, (value) => value !== ZERO),
      Option.map((value) => ({ line, date, amount: value, ...textIn(cells, indexes) })),
    );
  });

const rowOf =
  (indexes: Indexes) =>
  (line: Line): Result.Result<Option.Option<ParsedRow>, string> =>
    Option.match(Option.liftPredicate(cellAt(line.cells)(indexes.date), Str.isNonEmpty), {
      onNone: () => Result.succeed(Option.none()),
      onSome: (dateCell) => datedRow(line, indexes, dateCell),
    });

const filled = (cell: string): boolean => Str.isNonEmpty(clean(cell));

const bodyOf = (data: readonly Cells[], headerRow: number): readonly Line[] =>
  pipe(
    data,
    Arr.map((cells, index): Line => ({ cells, line: index + FIRST_LINE })),
    Arr.drop(headerRow),
    Arr.filter(({ cells }) => pipe(cells, Arr.some(filled))),
  );

const skippedLines = (
  body: readonly Line[],
  results: readonly Option.Option<ParsedRow>[],
): readonly number[] =>
  pipe(
    Arr.zip(body, results),
    Arr.filter(([, result]) => Option.isNone(result)),
    Arr.map(([{ line }]) => line),
  );

export const parseCsv = ({ csv, headerRow, columns }: CsvLayout): Result.Result<Parsed, string> =>
  Result.gen(function* parsed() {
    const { data } = parse<string[]>(csv, { skipEmptyLines: false });
    const header = yield* Result.fromOption(
      Arr.get(data, headerRow - FIRST_LINE),
      () => `${headerRow} 行目に見出しがありません`,
    );
    const names = pipe(header, Arr.map(clean));
    const indexes = yield* indexesOf({ columns, lookup: lookupIn(names) });
    const body = bodyOf(data, headerRow);
    const lines = pipe(body, Arr.map(rowOf(indexes)));
    const results = yield* Result.all(lines);
    return { rows: Arr.getSomes(results), skipped: skippedLines(body, results) };
  });

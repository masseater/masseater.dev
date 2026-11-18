import { Array as Arr, Option, Record as Rec, pipe } from "effect";

export type Cells = Readonly<Record<string, string | number>>;

const line = (cells: readonly string[]): string => `| ${Arr.join(cells, " | ")} |`;

const cellOf =
  (row: Cells) =>
  (column: string): string =>
    pipe(
      Rec.get(row, column),
      Option.map(String),
      Option.getOrElse(() => ""),
    );

const rule = (): string => "---";

const rowLine =
  (columns: readonly string[]) =>
  (row: Cells): string =>
    pipe(columns, Arr.map(cellOf(row)), line);

const ruleLine = (columns: readonly string[]): string => pipe(columns, Arr.map(rule), line);

export const table =
  (columns: readonly string[]) =>
  (rows: readonly Cells[]): string =>
    pipe(
      rows,
      Arr.map(rowLine(columns)),
      Arr.prependAll([line(columns), ruleLine(columns)]),
      Arr.join("\n"),
    );

import { Array as Arr, pipe } from "effect";

export type Row = Readonly<Record<string, string | number>>;

const SEPARATOR = "---";

const line = (cells: readonly string[]): string => `| ${Arr.join(cells, " | ")} |`;

const cellsOf =
  (columns: readonly string[]) =>
  (row: Row): readonly string[] =>
    pipe(
      columns,
      Arr.map((column) => String(row[column] ?? "")),
    );

export const table =
  (columns: readonly string[]) =>
  (rows: readonly Row[]): string =>
    pipe(
      rows,
      Arr.map((row) => line(cellsOf(columns)(row))),
      (body) => [
        line(columns),
        line(
          pipe(
            columns,
            Arr.map(() => SEPARATOR),
          ),
        ),
        ...body,
      ],
      Arr.join("\n"),
    );

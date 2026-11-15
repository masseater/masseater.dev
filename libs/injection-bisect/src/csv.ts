import { Array as Arr, Effect, Result, Stream, String as Str, pipe } from "effect";
import { Csv } from "effect/encoding";

import { proseUnitsOf } from "./located.ts";
import type { Parser, Unit } from "./parser.ts";

const DELIMITERS = { comma: ",", tab: "\t" } as const;

type Delimiter = keyof typeof DELIMITERS;

const ROWS = { comma: 2, tab: 1 } as const;

const COLUMNS = 2;

const START = 0;

const recordsOf = (
  text: string,
  options: Readonly<{ delimiter: Delimiter; ignoreEmptyLines: boolean }>,
): Result.Result<readonly Csv.Row[], Csv.CsvError> =>
  Stream.make(text).pipe(
    Stream.pipeThroughChannel(
      Csv.decodeString({
        delimiter: DELIMITERS[options.delimiter],
        ignoreEmptyLines: options.ignoreEmptyLines,
      }),
    ),
    Stream.runCollect,
    Effect.result,
    Effect.runSync,
  );

const isTable =
  (delimiter: Delimiter) =>
  (records: readonly Csv.Row[]): boolean =>
    Arr.matchLeft(records, {
      onEmpty: () => false,
      onNonEmpty: (header, body) =>
        header.length >= COLUMNS &&
        body.length >= ROWS[delimiter] &&
        pipe(
          body,
          Arr.every((record) => record.length === header.length),
        ),
    });

const looksLikeTable =
  (delimiter: Delimiter) =>
  (text: string): boolean =>
    Result.match(recordsOf(text, { delimiter, ignoreEmptyLines: true }), {
      onFailure: () => false,
      onSuccess: isTable(delimiter),
    });

const fieldsOf = (text: string, delimiter: Delimiter): readonly Unit[] =>
  Result.match(recordsOf(text, { delimiter, ignoreEmptyLines: false }), {
    onFailure: (): readonly Unit[] => [{ kind: "prose", start: START, end: text.length }],
    onSuccess: (records) =>
      proseUnitsOf({ text })(
        pipe(
          records,
          Arr.flatten,
          Arr.map((value) => Str.replaceAll('"', '""')(value)),
        ),
      ),
  });

export const csvParser: Parser = {
  format: "csv",
  extensions: [".csv"],
  accepts: looksLikeTable("comma"),
  unitsOf: (text) => fieldsOf(text, "comma"),
};

export const tsvParser: Parser = {
  format: "tsv",
  extensions: [".tsv", ".tab"],
  accepts: looksLikeTable("tab"),
  unitsOf: (text) => fieldsOf(text, "tab"),
};

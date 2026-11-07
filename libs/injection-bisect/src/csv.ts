import { Array as Arr, String as Str, pipe } from "effect";
import { parse } from "papaparse";

import { proseUnitsOf } from "./located.ts";
import type { Parser, Unit } from "./parser.ts";

const DELIMITERS = { comma: ",", tab: "\t" } as const;

type Delimiter = keyof typeof DELIMITERS;

const ROWS = { comma: 2, tab: 1 } as const;

const COLUMNS = 2;

const looksLikeTable =
  (delimiter: Delimiter) =>
  (text: string): boolean => {
    const { data, errors, meta } = parse(text, {
      delimiter: DELIMITERS[delimiter],
      header: true,
      skipEmptyLines: true,
    });
    return (
      Arr.isReadonlyArrayEmpty(errors) &&
      data.length >= ROWS[delimiter] &&
      (meta.fields ?? []).length >= COLUMNS
    );
  };

const fieldsOf = (text: string, delimiter: Delimiter): readonly Unit[] =>
  proseUnitsOf({ text })(
    pipe(
      parse<readonly string[]>(text, { delimiter: DELIMITERS[delimiter] }).data.flat(),
      Arr.map((value) => Str.replaceAll('"', '""')(value)),
    ),
  );

const csvParser: Parser = {
  format: "csv",
  extensions: [".csv"],
  accepts: looksLikeTable("comma"),
  unitsOf: (text) => fieldsOf(text, "comma"),
};

const tsvParser: Parser = {
  format: "tsv",
  extensions: [".tsv", ".tab"],
  accepts: looksLikeTable("tab"),
  unitsOf: (text) => fieldsOf(text, "tab"),
};

export { csvParser, tsvParser };

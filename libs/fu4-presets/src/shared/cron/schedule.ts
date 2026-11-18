import { Array as Arr, Result, String as Str, pipe } from "effect";

import { BOUNDS } from "./bounds.ts";
import type { FieldName } from "./bounds.ts";
import { fieldOf } from "./field.ts";
import type { Field } from "./field.ts";

export type Schedule = Readonly<Record<FieldName, Field>>;

const WHITESPACE = /\s+/u;
const FIELDS = 5;

const fieldsOf = (spec: string): readonly string[] =>
  pipe(Str.split(WHITESPACE)(spec), Arr.filter(Str.isNonEmpty));

const assemble = (fields: readonly string[]): Result.Result<Schedule, string> => {
  const [minute = "", hour = "", day = "", month = "", weekday = ""] = fields;
  return Result.all({
    minute: fieldOf(BOUNDS.minute)(minute),
    hour: fieldOf(BOUNDS.hour)(hour),
    day: fieldOf(BOUNDS.day)(day),
    month: fieldOf(BOUNDS.month)(month),
    weekday: fieldOf(BOUNDS.weekday)(weekday),
  });
};

export const parseCron = (spec: string): Result.Result<Schedule, string> => {
  if (Str.isEmpty(spec)) {
    return Result.fail("empty spec string");
  }
  if (Str.startsWith("@")(spec)) {
    return Result.fail(`parser does not accept descriptors: ${spec}`);
  }
  const fields = fieldsOf(spec);
  if (fields.length !== FIELDS) {
    return Result.fail(
      `expected exactly 5 fields, found ${String(fields.length)}: [${Arr.join(fields, " ")}]`,
    );
  }
  return assemble(fields);
};

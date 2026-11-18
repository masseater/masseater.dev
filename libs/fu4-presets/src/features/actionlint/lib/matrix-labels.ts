import { Array as Arr, Option, Record as Rec, Result, String as Str, pipe } from "effect";

import { parse } from "#/entities/expression/index.ts";
import { containsExpression, isExpressionAssigned } from "#/entities/workflow/index.ts";
import type { Matrix, MatrixAssign, RawValue } from "#/entities/workflow/model/job-types.ts";
import type { Text } from "#/shared/yaml/index.ts";

const OPEN = 3;

const matrixProperty = (label: Text): Option.Option<string> => {
  if (!isExpressionAssigned(label.value)) {
    return Option.none();
  }
  const parsed = parse(Str.slice(OPEN)(Str.trim(label.value))).result;
  return pipe(
    Result.getSuccess(parsed),
    Option.flatMap((expr) => {
      if (
        expr.type === "object-deref" &&
        expr.receiver.type === "variable" &&
        expr.receiver.name === "matrix"
      ) {
        return Option.some(expr.property);
      }
      return Option.none();
    }),
  );
};

const textOf = (value: RawValue): readonly Text[] => {
  if (value.type !== "string" || containsExpression(value.value)) {
    return [];
  }
  return [{ value: value.value, quoted: false, line: value.line, column: value.column }];
};

export const includedOf = (matrix: Matrix): readonly (readonly [string, MatrixAssign])[] =>
  pipe(
    Option.fromNullishOr(matrix.include),
    Option.map((include) => include.combinations),
    Option.getOrElse(() => []),
    Arr.flatMap((combination) => Rec.toEntries(combination.assigns)),
  );

const labelsOf = (matrix: Matrix, property: string): readonly Text[] => {
  const rows = pipe(
    Rec.get(matrix.rows, property),
    Option.map((row) => row.values),
    Option.getOrElse((): readonly RawValue[] => []),
  );
  const included = pipe(
    includedOf(matrix),
    Arr.filter(([name]) => name === property),
    Arr.map(([, assign]) => assign.value),
  );
  return pipe([...rows, ...included], Arr.flatMap(textOf));
};

export const labelsInMatrix =
  (matrix: Option.Option<Matrix>) =>
  (label: Text): readonly Text[] =>
    pipe(
      Option.all([matrix, matrixProperty(label)]),
      Option.map(([found, property]) => labelsOf(found, property)),
      Option.getOrElse((): readonly Text[] => []),
    );

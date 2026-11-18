import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import { isSubset, rawDescribe, rawEquals } from "#/entities/workflow/lib/raw-compare.ts";
import type {
  Matrix,
  MatrixAssign,
  MatrixCombinations,
  MatrixRow,
  RawValue,
} from "#/entities/workflow/model/job-types.ts";
import { includedOf } from "#/features/actionlint/lib/matrix-labels.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { quote, sortedQuotes } from "#/shared/text/index.ts";
import { describePosition } from "#/shared/yaml/index.ts";

type Rows = Readonly<Record<string, readonly RawValue[]>>;

const NONE = 0;

const rowName = (row: MatrixRow): string =>
  pipe(
    Option.fromNullishOr(row.name),
    Option.map((name) => name.value),
    Option.getOrElse(() => ""),
  );

const checkDuplicates =
  (fail: Fail) =>
  (row: MatrixRow): void => {
    const seen: RawValue[] = [];
    for (const value of row.values) {
      const previous = pipe(seen, Arr.findFirst(rawEquals(value)));
      if (Option.isSome(previous)) {
        fail(
          value,
          `duplicate value ${rawDescribe(value)} is found in matrix ${quote(rowName(row))}. the same value is at ${describePosition(previous.value)}`,
        );
      } else {
        seen.push(value);
      }
    }
  };

const isSet = (value: unknown): boolean => !Predicate.isUndefined(value);

const hasExpression = (combinations: MatrixCombinations): boolean =>
  isSet(combinations.expression) ||
  pipe(
    combinations.combinations,
    Arr.some((combination) => isSet(combination.expression)),
  );

const withValue = (rows: Rows, name: string, value: RawValue): Rows => {
  const row = Option.getOrElse(Rec.get(rows, name), (): readonly RawValue[] => []);
  if (pipe(row, Arr.some(rawEquals(value)))) {
    return rows;
  }
  return Rec.set(rows, name, Arr.append(row, value));
};

const knownRows = (matrix: Matrix, ignored: readonly string[]): Rows => {
  const declared = pipe(
    matrix.rows,
    Rec.filter((_row, name) => !Arr.contains(ignored, name)),
    Rec.map((row) => row.values),
  );
  let rows = declared;
  for (const [name, assign] of includedOf(matrix)) {
    if (!Arr.contains(ignored, name)) {
      rows = withValue(rows, name, assign.value);
    }
  }
  return rows;
};

const checkAssign =
  (fail: Fail, rows: Rows) =>
  (key: string, assign: MatrixAssign): void => {
    const found = Rec.get(rows, key);
    if (Option.isNone(found)) {
      fail(
        assign.key,
        `${quote(key)} in "exclude" section does not exist in matrix. available matrix configurations are ${sortedQuotes(Rec.keys(rows))}`,
      );
      return;
    }
    if (
      !pipe(
        found.value,
        Arr.some((value) => isSubset(value)(assign.value)),
      )
    ) {
      fail(
        assign.value,
        `value ${rawDescribe(assign.value)} in "exclude" does not match in matrix ${quote(key)} combinations. possible values are ${pipe(found.value, Arr.map(rawDescribe), Arr.join(", "))}`,
      );
    }
  };

const isEmptyMatrix = (matrix: Matrix): boolean =>
  Rec.isEmptyRecord(matrix.rows) && Arr.isReadonlyArrayEmpty(includedOf(matrix));

const isSkipped = (matrix: Matrix, exclude: MatrixCombinations): boolean =>
  exclude.combinations.length === NONE ||
  Option.exists(Option.fromNullishOr(matrix.include), hasExpression);

const ignoredOf = (matrix: Matrix): readonly string[] =>
  pipe(
    Rec.toEntries(matrix.rows),
    Arr.filter(([, row]) => isSet(row.expression)),
    Arr.map(([name]) => name),
  );

const checkExclude =
  (fail: Fail) =>
  (matrix: Matrix, exclude: MatrixCombinations): void => {
    if (isSkipped(matrix, exclude)) {
      return;
    }
    if (isEmptyMatrix(matrix)) {
      fail(matrix, '"exclude" section exists but no matrix variation exists');
      return;
    }
    const ignored = ignoredOf(matrix);
    const check = checkAssign(fail, knownRows(matrix, ignored));
    const assigns = pipe(
      exclude.combinations,
      Arr.flatMap((combination) => Rec.toEntries(combination.assigns)),
      Arr.filter(([key]) => !Arr.contains(ignored, key)),
    );
    for (const [key, assign] of assigns) {
      check(key, assign);
    }
  };

const matrixOf = (strategy: { readonly matrix?: Matrix } | undefined): Option.Option<Matrix> =>
  pipe(
    Option.fromNullishOr(strategy),
    Option.flatMap((found) => Option.fromNullishOr(found.matrix)),
    Option.filter((found) => !isSet(found.expression)),
  );

const checkMatrix = (fail: Fail, found: Matrix): void => {
  for (const row of Rec.values(found.rows)) {
    if (!isSet(row.expression)) {
      checkDuplicates(fail)(row);
    }
  }
  for (const exclude of Option.toArray(Option.fromNullishOr(found.exclude))) {
    checkExclude(fail)(found, exclude);
  }
};

export const matrix = workflowRule({
  description: "Reports duplicated matrix values and exclude entries that match nothing",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-matrix-values",
  visitor: (fail): Visitor => ({
    ...NOOP,
    jobPre: (job) => {
      for (const found of Option.toArray(matrixOf(job.strategy))) {
        checkMatrix(fail, found);
      }
    },
  }),
});

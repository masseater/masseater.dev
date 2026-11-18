import { Array as Arr, Match, Option, pipe } from "effect";

import { matchesPattern } from "#/entities/expression-tree/index.ts";
import type { ContextExpr } from "#/entities/expression-tree/index.ts";
import type { LoE } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { Expansion, MatrixView } from "#/features/audit-workflows/model/step.ts";
import type { Matrix, MatrixRow, MatrixValue } from "#/features/audit-workflows/model/workflow.ts";

import { extractAllFenced } from "./expressions.ts";
import { annotated, withKeys } from "./location.ts";

const walkPath =
  (path: string, base: SymbolicLocation) =>
  (tree: MatrixValue): readonly Expansion[] =>
    Match.value(tree).pipe(
      Match.discriminatorsExhaustive("kind")({
        null: (): readonly Expansion[] => [],
        scalar: ({ text }) => [{ path, value: text, location: base }],
        array: ({ items }) =>
          pipe(
            items,
            Arr.flatMap((item, index) => walkPath(path, withKeys(index)(base))(item)),
          ),
        object: ({ entries }) =>
          pipe(
            entries,
            Arr.flatMap(([key, value]) => walkPath(`${path}.${key}`, withKeys(key)(base))(value)),
          ),
      }),
    );

const expand = (values: MatrixRow, base: SymbolicLocation): readonly Expansion[] =>
  pipe(
    values,
    Arr.flatMap(([key, value]) =>
      walkPath(`matrix.${key}`, annotated("this expansion")(withKeys(key)(base)))(value),
    ),
  );

const sameExpansion = (left: Expansion, right: Expansion): boolean =>
  left.path === right.path && left.value === right.value;

const dimensionRow = (
  dimensions: readonly (readonly [string, LoE<readonly MatrixValue[]>])[],
): MatrixRow =>
  pipe(
    dimensions,
    Arr.map(([key, value]): readonly [string, MatrixValue] => {
      if (value.type === "expr") {
        return [key, { kind: "scalar", text: value.raw }];
      }
      return [key, { kind: "array", items: value.value }];
    }),
  );

const literalRows = (rows: LoE<readonly MatrixRow[]>): readonly MatrixRow[] => {
  if (rows.type === "literal") {
    return rows.value;
  }
  return [];
};

const literalMatrix = (inner: Matrix, location: SymbolicLocation): MatrixView => {
  if (inner.dimensions.type === "expr") {
    return {
      location,
      expansions: [],
      indirectlyExpanded: Option.some(location),
      indirectInclusions: Option.none(),
    };
  }
  const expanded = expand(dimensionRow(inner.dimensions.value), location);
  const excluded = pipe(
    literalRows(inner.exclude),
    Arr.flatMap((row) => expand(row, withKeys("exclude")(location))),
  );
  const kept = pipe(
    expanded,
    Arr.filter(
      (each) =>
        !pipe(
          excluded,
          Arr.some((other) => sameExpansion(each, other)),
        ),
    ),
  );
  const included = pipe(
    literalRows(inner.include),
    Arr.flatMap((row, index) => expand(row, withKeys("include", index)(location))),
  );
  return {
    location,
    expansions: [...kept, ...included],
    indirectlyExpanded: Option.none(),
    indirectInclusions: Option.liftPredicate(
      withKeys("include")(location),
      () => inner.include.type === "expr",
    ),
  };
};

export const matrixView =
  (matrix: LoE<Matrix>) =>
  (location: SymbolicLocation): MatrixView => {
    if (matrix.type === "expr") {
      return {
        location,
        expansions: [],
        indirectlyExpanded: Option.some(location),
        indirectInclusions: Option.none(),
      };
    }
    return literalMatrix(matrix.value, location);
  };

export const isStaticExpansion = (expansion: Expansion): boolean =>
  Arr.isReadonlyArrayEmpty(extractAllFenced(expansion.value));

export const hasIndirectExpansions = (matrix: MatrixView): boolean =>
  Option.isSome(matrix.indirectlyExpanded) || Option.isSome(matrix.indirectInclusions);

export const expandsToStaticValues =
  (matrix: MatrixView) =>
  (context: ContextExpr): boolean => {
    if (Option.isSome(matrix.indirectlyExpanded)) {
      return false;
    }
    return !pipe(
      matrix.expansions,
      Arr.some(
        (expansion) => matchesPattern(expansion.path)(context) && !isStaticExpansion(expansion),
      ),
    );
  };

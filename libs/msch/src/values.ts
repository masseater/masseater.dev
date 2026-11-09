import { Array as Arr, Function as Fn, Option, pipe } from "effect";

import { IndexKind } from "./compiler.ts";
import type { Checker, Type } from "./compiler.ts";

type Value = string | number;

interface Vocabulary {
  readonly values: readonly Value[];
  readonly admitsUnnamedValues: boolean;
}

const SCHEMA_TYPE_PROPERTIES = ["Type", "_output"] as const;

const MINIMUM_SET_SIZE = 2;

const DATA_FIRST_ARITY = 2;

const valueKey = (value: Value): string => `${typeof value}:${String(value)}`;

const literalValueOf = (type: Type): Option.Option<Value> => {
  if (type.isStringLiteralType() || type.isNumberLiteralType()) {
    return Option.some(type.value);
  }
  return Option.none();
};

const literalValuesOf = (types: readonly Type[]): Option.Option<readonly Value[]> => {
  const values = pipe(
    types,
    Arr.map((member) => literalValueOf(member)),
    Arr.getSomes,
    Arr.dedupeWith((left, right) => valueKey(left) === valueKey(right)),
  );
  if (values.length !== types.length || values.length < MINIMUM_SET_SIZE) {
    return Option.none();
  }
  return Option.some(values);
};

const literalUnionOf = (type: Type): Option.Option<readonly Value[]> => {
  if (!type.isUnionType()) {
    return Option.none();
  }
  return literalValuesOf(type.getTypes());
};

const elementTypeOf = (checker: Checker, type: Type): Option.Option<Type> => {
  if (!checker.isArrayLikeType(type)) {
    return Option.none();
  }
  return Option.fromUndefinedOr(checker.getIndexTypeOfType(type, IndexKind.Number));
};

const schemaTypeOf =
  (checker: Checker) =>
  (type: Type): Option.Option<Type> =>
    Arr.findFirst(SCHEMA_TYPE_PROPERTIES, (name) =>
      Option.fromUndefinedOr(checker.getPropertyOfType(type, name)),
    ).pipe(Option.map((property) => checker.getTypeOfSymbol(property)));

const finiteValuesOf =
  (checker: Checker) =>
  (type: Type): Option.Option<readonly Value[]> =>
    literalUnionOf(type).pipe(
      Option.orElse(() => elementTypeOf(checker, type).pipe(Option.flatMap(literalUnionOf))),
      Option.orElse(() => schemaTypeOf(checker)(type).pipe(Option.flatMap(literalUnionOf))),
    );

const vocabularyOf =
  (checker: Checker) =>
  (type: Type): Option.Option<Vocabulary> => {
    if (!type.isUnionType()) {
      return Option.none();
    }
    const optionalIds = new Set([checker.getUndefinedType().id, checker.getNullType().id]);
    const members = pipe(
      type.getTypes(),
      Arr.filter((member) => !optionalIds.has(member.id)),
    );
    const values = Arr.getSomes(
      pipe(
        members,
        Arr.map((member) => literalValueOf(member)),
      ),
    );
    if (values.length < MINIMUM_SET_SIZE) {
      return Option.none();
    }
    return Option.some({ values, admitsUnnamedValues: values.length !== members.length });
  };

const isSubsetOf: {
  (superset: readonly Value[]): (subset: readonly Value[]) => boolean;
  (subset: readonly Value[], superset: readonly Value[]): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (subset: readonly Value[], superset: readonly Value[]): boolean => {
  const held = new Set(
    pipe(
      superset,
      Arr.map((value) => valueKey(value)),
    ),
  );
  return pipe(
    subset,
    Arr.every((value) => held.has(valueKey(value))),
  );
});

const sameValues: {
  (right: readonly Value[]): (left: readonly Value[]) => boolean;
  (left: readonly Value[], right: readonly Value[]): boolean;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (left: readonly Value[], right: readonly Value[]): boolean =>
    left.length === right.length && isSubsetOf(left, right),
);

const valueText = (value: Value): string => {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return String(value);
};

const formatValues = (values: readonly Value[]): string =>
  pipe(values, Arr.map(valueText), Arr.join(" | "));

export {
  finiteValuesOf,
  formatValues,
  isSubsetOf,
  literalUnionOf,
  literalValuesOf,
  sameValues,
  schemaTypeOf,
  valueKey,
  vocabularyOf,
};
export type { Value, Vocabulary };

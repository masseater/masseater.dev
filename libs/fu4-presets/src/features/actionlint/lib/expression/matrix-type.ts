import { Array as Arr, Option, Predicate, Record as Rec, String as Str, pipe } from "effect";

import {
  ANY,
  BOOL,
  NULL,
  NUMBER,
  STRING,
  arrayOf,
  loose,
  merge,
  strict,
} from "#/entities/expression/index.ts";
import type { ExprType, ObjectType } from "#/entities/expression/index.ts";
import { isExpressionAssigned } from "#/entities/workflow/index.ts";
import type {
  Matrix,
  MatrixCombinations,
  MatrixRow,
  RawValue,
} from "#/entities/workflow/model/job-types.ts";
import { parseGoFloat } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv } from "./env.ts";
import { checkExprsIn } from "./scan.ts";
import { checkArrayExpr, checkObjectExpr, checkObjectType, checkOne } from "./strings.ts";

const KEY = "jobs.<job_id>.strategy";
const isSet = (value: unknown): boolean => !Predicate.isUndefined(value);
const SINGLE = 1;
const LITERALS: Readonly<Record<string, ExprType>> = { true: BOOL, false: BOOL, null: NULL };

export const literalType = (value: string): ExprType => {
  const trimmed = Str.trim(value);
  return pipe(
    Rec.get(LITERALS, trimmed),
    Option.orElse(() => Option.as(parseGoFloat(trimmed), NUMBER)),
    Option.getOrElse(() => STRING),
  );
};

const mergeAll = (types: readonly ExprType[]): ExprType => {
  let out = Option.none<ExprType>();
  for (const type of types) {
    out = Option.some(Option.match(out, { onNone: () => type, onSome: (acc) => merge(acc)(type) }));
  }
  return Option.getOrElse(out, () => ANY);
};

const elemOf = (type: ExprType): Option.Option<ExprType> => {
  if (type.kind === "array") {
    return Option.some(type.elem);
  }
  return Option.none();
};

const isObject = (type: ExprType): type is ObjectType => type.kind === "object";

const stringType = (
  env: ExprEnv,
  value: Extract<RawValue, { readonly type: "string" }>,
): ExprType => {
  const typed = checkExprsIn(env)({ untrusted: false, key: KEY })({
    value: value.value,
    quoted: false,
    line: value.line,
    column: value.column,
  });
  if (!isExpressionAssigned(value.value)) {
    return literalType(value.value);
  }
  return pipe(
    typed,
    Option.filter((found) => found.length === SINGLE),
    Option.flatMap(Arr.head),
    Option.map((one) => one.type),
    Option.getOrElse(() => ANY),
  );
};

export const rawType =
  (env: ExprEnv) =>
  (value: RawValue): ExprType => {
    if (value.type === "object") {
      const props = pipe(value.props, Rec.map(rawType(env)));
      return strict(props);
    }
    if (value.type === "array") {
      const elems = pipe(value.elems, Arr.map(rawType(env)));
      return arrayOf(mergeAll(elems));
    }
    return stringType(env, value);
  };

const mergedProp = (object: ObjectType, name: string, type: ExprType): ExprType =>
  Option.match(Rec.get(object.props, name), {
    onNone: () => type,
    onSome: (current) => merge(current)(type),
  });

const withProp = (object: ObjectType, name: string, type: ExprType): ObjectType => ({
  ...object,
  props: Rec.set(object.props, name, mergedProp(object, name, type)),
});

const includedObject = (type: ExprType): Option.Option<ObjectType> =>
  pipe(elemOf(type), Option.filter(isObject));

const withProps = (base: ObjectType, extra: ObjectType): ObjectType => {
  let out = base;
  for (const [name, prop] of Rec.toEntries(extra.props)) {
    out = withProp(out, name, prop);
  }
  return out;
};

const withoutProp = (object: ObjectType, name: string): ObjectType => ({
  ...object,
  props: Rec.remove(object.props, name),
});

const fromExpression = (env: ExprEnv, text: Text): ObjectType => {
  const type = pipe(checkObjectExpr(env)(text, "matrix", KEY), Option.filter(isObject));
  if (Option.isNone(type)) {
    return loose();
  }
  const include = pipe(Rec.get(type.value.props, "include"), Option.flatMap(includedObject));
  const base = withoutProp(type.value, "include");
  const merged = Option.match(include, {
    onNone: () => base,
    onSome: (extra) => withProps(base, extra),
  });
  return withoutProp(merged, "exclude");
};

const rowType = (env: ExprEnv, row: MatrixRow): ExprType => {
  const expression = Option.fromNullishOr(row.expression);
  if (Option.isSome(expression)) {
    return pipe(
      checkArrayExpr(env)(expression.value, "matrix row", KEY),
      Option.flatMap(elemOf),
      Option.getOrElse(() => ANY),
    );
  }
  const values = pipe(row.values, Arr.map(rawType(env)));
  return mergeAll(values);
};

const checkExcludeExpression = (env: ExprEnv, expression: Text): void => {
  const elem = pipe(checkArrayExpr(env)(expression, "exclude", KEY), Option.flatMap(elemOf));
  for (const found of Option.toArray(elem)) {
    checkObjectType(env)(expression)(found, "exclude");
  }
};

const checkExclude = (env: ExprEnv, exclude: MatrixCombinations): void => {
  const expression = Option.fromNullishOr(exclude.expression);
  if (Option.isSome(expression)) {
    checkExcludeExpression(env, expression.value);
    return;
  }
  for (const combination of exclude.combinations) {
    const each = Option.fromNullishOr(combination.expression);
    if (Option.isSome(each)) {
      checkObjectExpr(env)(each.value, "exclude", KEY);
    } else {
      for (const assign of Rec.values(combination.assigns)) {
        rawType(env)(assign.value);
      }
    }
  }
};

const includeExpression = (env: ExprEnv, base: ObjectType, expression: Text): ObjectType =>
  pipe(
    checkOne(env)(expression, "include", KEY),
    Option.flatMap(elemOf),
    Option.map((elem) => merge(base)(elem)),
    Option.filter(isObject),
    Option.getOrElse(() => loose()),
  );

const withInclude = (env: ExprEnv, base: ObjectType, include: MatrixCombinations): ObjectType => {
  const expression = Option.fromNullishOr(include.expression);
  if (Option.isSome(expression)) {
    return includeExpression(env, base, expression.value);
  }
  const assigns = pipe(
    include.combinations,
    Arr.filter((combination) => !isSet(combination.expression)),
    Arr.flatMap((combination) => Rec.toEntries(combination.assigns)),
  );
  let out = base;
  for (const [name, assign] of assigns) {
    out = withProp(out, name, rawType(env)(assign.value));
  }
  return out;
};

export const matrixType =
  (env: ExprEnv) =>
  (matrix: Matrix): ObjectType => {
    const expression = Option.fromNullishOr(matrix.expression);
    if (Option.isSome(expression)) {
      return fromExpression(env, expression.value);
    }
    for (const exclude of Option.toArray(Option.fromNullishOr(matrix.exclude))) {
      checkExclude(env, exclude);
    }
    const base = strict(
      pipe(
        matrix.rows,
        Rec.map((row) => rowType(env, row)),
      ),
    );
    return Option.match(Option.fromNullishOr(matrix.include), {
      onNone: () => base,
      onSome: (include) => withInclude(env, base, include),
    });
  };

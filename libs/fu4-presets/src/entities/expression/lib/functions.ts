import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, BOOL, STRING, arrayOf, describe } from "#/entities/expression/model/types.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";

export interface Signature {
  readonly name: string;
  readonly ret: ExprType;
  readonly params: readonly ExprType[];
  readonly variadic: boolean;
  readonly constant: boolean;
}

interface Shape {
  readonly variadic?: boolean;
  readonly constant?: boolean;
}

const STRINGS = arrayOf(STRING);
const PURE: Shape = { constant: true };
const IMPURE: Shape = { constant: false };

const signature =
  (name: string, ret: ExprType, ...params: readonly ExprType[]) =>
  (shape: Shape): Signature => ({
    name,
    ret,
    params,
    variadic: shape.variadic ?? false,
    constant: shape.constant ?? false,
  });

export const FUNCTIONS: Readonly<Record<string, readonly Signature[]>> = {
  contains: [
    signature("contains", BOOL, STRING, STRING)(PURE),
    signature("contains", BOOL, arrayOf(ANY), ANY)(PURE),
  ],
  startswith: [signature("startsWith", BOOL, STRING, STRING)(PURE)],
  endswith: [signature("endsWith", BOOL, STRING, STRING)(PURE)],
  format: [signature("format", STRING, STRING, ANY)({ variadic: true, constant: true })],
  join: [
    signature("join", STRING, STRINGS, STRING)(PURE),
    signature("join", STRING, STRINGS)(PURE),
  ],
  tojson: [signature("toJSON", STRING, ANY)(PURE)],
  fromjson: [signature("fromJSON", ANY, STRING)(IMPURE)],
  hashfiles: [signature("hashFiles", STRING, STRING)({ variadic: true, constant: false })],
  success: [signature("success", BOOL)(IMPURE)],
  always: [signature("always", BOOL)(IMPURE)],
  cancelled: [signature("cancelled", BOOL)(IMPURE)],
  failure: [signature("failure", BOOL)(IMPURE)],
  case: [signature("case", ANY, BOOL, ANY, ANY)({ variadic: true, constant: true })],
};

export const signaturesOf = (callee: string): Option.Option<readonly Signature[]> =>
  Rec.get(FUNCTIONS, Str.toLowerCase(callee));

const DOTS: Readonly<Record<string, string>> = { true: "...", false: "" };

export const describeSignature = (sig: Signature): string => {
  const params = pipe(sig.params, Arr.map(describe), Arr.join(", "));
  return `${sig.name}(${params}${DOTS[String(sig.variadic)] ?? ""}) -> ${describe(sig.ret)}`;
};

const LITERALS = new Set(["null", "bool", "int", "float", "string"]);

export const isConstant = (expr: Expr): boolean => {
  if (LITERALS.has(expr.type)) {
    return true;
  }
  if (expr.type === "not") {
    return isConstant(expr.operand);
  }
  if (expr.type === "compare" || expr.type === "logical") {
    return isConstant(expr.left) && isConstant(expr.right);
  }
  if (expr.type === "call") {
    return (
      pipe(
        expr.args,
        Arr.every((arg) => isConstant(arg)),
      ) &&
      Option.exists(
        signaturesOf(expr.callee),
        Arr.every((sig) => sig.constant),
      )
    );
  }
  return false;
};

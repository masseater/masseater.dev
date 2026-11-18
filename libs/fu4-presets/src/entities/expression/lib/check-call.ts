import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { assignable } from "#/entities/expression/model/assign.ts";
import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, describe } from "#/entities/expression/model/types.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";
import { ordinal, quote, sortedQuotes } from "#/shared/text/index.ts";

import { checkBuiltin } from "./check-builtin.ts";
import { FUNCTIONS, describeSignature, signaturesOf } from "./functions.ts";
import type { Signature } from "./functions.ts";
import type { Scope } from "./scope.ts";

export interface Call {
  readonly expr: Expr;
  readonly callee: string;
  readonly args: readonly Expr[];
}

interface Failure {
  readonly at: Expr;
  readonly message: string;
}

const NEXT = 1;
const AT_LEAST: Readonly<Record<string, string>> = { true: "at least ", false: "" };

const arityOk = (sig: Signature, given: number): boolean => {
  if (sig.variadic) {
    return sig.params.length <= given;
  }
  return sig.params.length === given;
};

const arityError = (call: Call, sig: Signature): Failure => ({
  at: call.expr,
  message: `number of arguments is wrong. function ${quote(describeSignature(sig))} takes ${AT_LEAST[String(sig.variadic)] ?? ""}${String(sig.params.length)} parameters but ${String(call.args.length)} arguments are given`,
});

const mismatch =
  (call: Call, sig: Signature) =>
  ([index, param, arg]: readonly [number, ExprType, ExprType]): Option.Option<Failure> => {
    if (assignable(param)(arg)) {
      return Option.none();
    }
    return Option.some({
      at: call.args[index] ?? call.expr,
      message: `${ordinal(index + NEXT)} argument of function call is not assignable. ${quote(describe(arg))} cannot be assigned to ${quote(describe(param))}. called function type is ${quote(describeSignature(sig))}`,
    });
  };

const signatureError =
  (call: Call, types: readonly ExprType[]) =>
  (sig: Signature): Option.Option<Failure> => {
    if (!arityOk(sig, types.length)) {
      return Option.some(arityError(call, sig));
    }
    const last = Option.getOrElse(Arr.last(sig.params), () => ANY);
    return pipe(
      types,
      Arr.map((arg, index): readonly [number, ExprType, ExprType] => [
        index,
        sig.params[index] ?? last,
        arg,
      ]),
      Arr.findFirst((triple) => mismatch(call, sig)(triple)),
    );
  };

const undefinedFunction = (scope: Scope, call: Call): ExprType => {
  scope.fail(
    call.expr,
    `undefined function ${quote(call.callee)}. available functions are ${sortedQuotes(Rec.keys(FUNCTIONS))}`,
  );
  return ANY;
};

const resolve = (scope: Scope, call: Call, signatures: readonly Signature[]): ExprType => {
  const types = pipe(
    call.args,
    Arr.map((arg) => scope.check(arg)),
  );
  const failures: Failure[] = [];
  for (const sig of signatures) {
    const failure = signatureError(call, types)(sig);
    if (Option.isNone(failure)) {
      return checkBuiltin(scope)({ ...call, lower: Str.toLowerCase(call.callee), ret: sig.ret });
    }
    failures.push(failure.value);
  }
  for (const failure of failures) {
    scope.fail(failure.at, failure.message);
  }
  return ANY;
};

export const checkCall =
  (scope: Scope) =>
  (call: Call): ExprType =>
    Option.match(signaturesOf(call.callee), {
      onNone: () => undefinedFunction(scope, call),
      onSome: (signatures) => resolve(scope, call, signatures),
    });

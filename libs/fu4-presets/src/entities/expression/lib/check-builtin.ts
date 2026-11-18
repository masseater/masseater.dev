import { Array as Arr, Option, Order, Record as Rec, Schema, pipe } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ofJson } from "#/entities/expression/model/of-json.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";
import { quote, quotes } from "#/shared/text/index.ts";

import { SPECIAL } from "./availability.ts";
import { formatPlaceholders } from "./format-placeholders.ts";
import { checkJson } from "./json.ts";
import { AVAILABILITY_DOCS } from "./scope.ts";
import type { Scope } from "./scope.ts";

export interface Builtin {
  readonly expr: Expr;
  readonly callee: string;
  readonly lower: string;
  readonly args: readonly Expr[];
  readonly ret: ExprType;
}

const NEXT = 1;
const PAIR = 2;
const EVEN = 0;

const checkSpecial = (scope: Scope, call: Builtin): void => {
  for (const allowed of Option.toArray(Rec.get(SPECIAL, call.lower))) {
    if (!Arr.contains(scope.env.special, call.lower)) {
      scope.fail(
        call.expr,
        `calling function ${quote(call.callee)} is not allowed here. ${quote(call.callee)} is only available in ${quotes(allowed)}. ${AVAILABILITY_DOCS}`,
      );
    }
  }
};

const checkFormat = (scope: Scope, call: Builtin, format: string): ExprType => {
  const count = call.args.length - NEXT;
  const holders = new Set(formatPlaceholders(format));
  for (let index = 0; index < count; index += NEXT) {
    if (!holders.delete(index)) {
      scope.fail(
        call.expr,
        `format string ${quote(format)} does not contain placeholder {${String(index)}}. remove argument which is unused in the format string`,
      );
    }
  }
  for (const index of Arr.sort([...holders], Order.Number)) {
    scope.fail(
      call.expr,
      `format string ${quote(format)} contains placeholder {${String(index)}} but only ${String(count)} arguments are given to format`,
    );
  }
  return call.ret;
};

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const parsed = (call: Builtin, text: string): ExprType =>
  Option.match(decodeJson(text), { onNone: () => call.ret, onSome: ofJson });

const checkFromJson = (scope: Scope, call: Builtin, { literal, text }: Literal): ExprType =>
  Option.match(checkJson(text), {
    onNone: () => parsed(call, text),
    onSome: (error) => {
      scope.fail(
        literal,
        `broken JSON string is passed to fromJSON() at offset ${String(error.offset)}: ${error.message}`,
      );
      return call.ret;
    },
  });

const checkCase = (scope: Scope, call: Builtin): ExprType => {
  if (call.args.length % PAIR === EVEN) {
    scope.fail(
      call.expr,
      `case() requires an odd number of arguments (pred/value pairs + default) but got ${String(call.args.length)}`,
    );
  }
  return call.ret;
};

interface Literal {
  readonly literal: Expr;
  readonly text: string;
}

const literalOf = (expr: Expr): Option.Option<Literal> => {
  if (expr.type === "string") {
    return Option.some({ literal: expr, text: expr.value });
  }
  return Option.none();
};

const withLiteral = (call: Builtin, then: (found: Literal) => ExprType): ExprType =>
  pipe(
    Arr.head(call.args),
    Option.flatMap(literalOf),
    Option.match({ onNone: () => call.ret, onSome: then }),
  );

export const checkBuiltin =
  (scope: Scope) =>
  (call: Builtin): ExprType => {
    checkSpecial(scope, call);
    if (call.lower === "format") {
      return withLiteral(call, (found) => checkFormat(scope, call, found.text));
    }
    if (call.lower === "fromjson") {
      return withLiteral(call, (found) => checkFromJson(scope, call, found));
    }
    if (call.lower === "case") {
      return checkCase(scope, call);
    }
    return call.ret;
  };

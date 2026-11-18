import { Option, Record as Rec, Result, String as Str, pipe } from "effect";

import type {
  CompareOp,
  Expr,
  ExprError,
  LogicalOp,
  TokenKind,
} from "#/entities/expression/model/ast.ts";
import { quotes } from "#/shared/text/index.ts";

import { parsePrimary, unexpected } from "./primary.ts";
import { streamOf } from "./stream.ts";
import type { Stream } from "./stream.ts";

export interface Parsed {
  readonly result: Result.Result<Expr, ExprError>;
  readonly offset: number;
}

type Level = (stream: Stream) => Option.Option<Expr>;

const COMPARE: Readonly<Record<string, CompareOp>> = {
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  "==": "==",
  "!=": "!=",
};

const DEREF_PLACE =
  "object property dereference like 'a.b' or array element dereference like 'a.*'";
const DEREF_EXPECTED: readonly TokenKind[] = ["IDENT", "*"];

const parseDeref = (stream: Stream, receiver: Expr): Option.Option<Expr> => {
  stream.next();
  const kind = stream.peek();
  if (kind === "*") {
    stream.next();
    return Option.some({ type: "array-deref", receiver });
  }
  if (kind === "IDENT") {
    return Option.some({
      type: "object-deref",
      receiver,
      property: Str.toLowerCase(stream.next().value),
    });
  }
  return unexpected(stream)(DEREF_PLACE, DEREF_EXPECTED);
};

const parseIndex =
  (parseOr: Level) =>
  (stream: Stream, operand: Expr): Option.Option<Expr> => {
    stream.next();
    const index = parseOr(stream);
    if (Option.isNone(index)) {
      return index;
    }
    if (stream.peek() !== "]") {
      return unexpected(stream)("closing bracket ']' for index access", ["]"]);
    }
    stream.next();
    return Option.some({ type: "index", operand, index: index.value });
  };

const postfixStep =
  (parseOr: Level) =>
  (stream: Stream, receiver: Expr): Option.Option<Expr> => {
    if (stream.peek() === ".") {
      return parseDeref(stream, receiver);
    }
    return parseIndex(parseOr)(stream, receiver);
  };

const isPostfix = (stream: Stream): boolean => stream.peek() === "." || stream.peek() === "[";

const parsePostfix =
  (parseOr: Level): Level =>
  (stream) => {
    let ret = parsePrimary(parseOr)(stream);
    while (Option.isSome(ret) && isPostfix(stream)) {
      ret = postfixStep(parseOr)(stream, ret.value);
    }
    return ret;
  };

const parsePrefix =
  (parseOr: Level): Level =>
  (stream) => {
    if (stream.peek() !== "!") {
      return parsePostfix(parseOr)(stream);
    }
    const token = stream.next();
    return pipe(
      parsePrefix(parseOr)(stream),
      Option.map((operand): Expr => ({ type: "not", operand, token })),
    );
  };

const parseCompare =
  (parseOr: Level): Level =>
  (stream) => {
    const left = parsePrefix(parseOr)(stream);
    const op = Rec.get(COMPARE, stream.peek());
    if (Option.isNone(left) || Option.isNone(op)) {
      return left;
    }
    stream.next();
    return pipe(
      parseCompare(parseOr)(stream),
      Option.map((right): Expr => ({ type: "compare", op: op.value, left: left.value, right })),
    );
  };

const logical =
  (op: LogicalOp, operand: Level): Level =>
  (stream) => {
    const left = operand(stream);
    if (Option.isNone(left) || stream.peek() !== op) {
      return left;
    }
    stream.next();
    return pipe(
      logical(op, operand)(stream),
      Option.map((right): Expr => ({ type: "logical", op, left: left.value, right })),
    );
  };

const parseOr: Level = (stream) => logical("||", logical("&&", parseCompare(parseOr)))(stream);

const remaining = (stream: Stream): ExprError => {
  const token = stream.current();
  const names = [token.kind, ...stream.drain()];
  return {
    message: `parser did not reach end of input after parsing the expression. ${names.length} remaining token(s) in the input: ${quotes(names)}`,
    line: token.line,
    column: token.column,
  };
};

const outcome = (stream: Stream, root: Option.Option<Expr>): Result.Result<Expr, ExprError> => {
  const failure = pipe(stream.lexError(), Option.orElse(stream.parseError));
  if (Option.isSome(failure)) {
    return Result.fail(failure.value);
  }
  if (Option.isNone(root)) {
    const token = stream.current();
    return Result.fail({ message: "unknown parse error", line: token.line, column: token.column });
  }
  if (stream.peek() !== "END") {
    return Result.fail(remaining(stream));
  }
  return Result.succeed(root.value);
};

export const parse = (src: string): Parsed => {
  const stream = streamOf(src);
  const result = outcome(stream, parseOr(stream));
  return { result, offset: stream.offset() };
};

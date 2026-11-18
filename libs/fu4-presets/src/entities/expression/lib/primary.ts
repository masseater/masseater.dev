import { Option, Record as Rec, String as Str, pipe } from "effect";

import type { Expr, TokenKind } from "#/entities/expression/model/ast.ts";
import { quote, quotes } from "#/shared/text/index.ts";

import { intLiteralError } from "./int-literal.ts";
import type { Stream } from "./stream.ts";

export type Parse = (stream: Stream) => Option.Option<Expr>;

const PRIMARY: readonly TokenKind[] = ["IDENT", "(", "INTEGER", "FLOAT", "STRING"];
const STRING_DELIMITERS = /^'|'$/gu;
const ESCAPED_QUOTE = /''/gu;
const QUOTE = "'";

const describe = (stream: Stream): string => {
  if (stream.peek() === "END") {
    return "end of input";
  }
  return `token ${quote(stream.peek())}`;
};

export const unexpected =
  (stream: Stream) =>
  (place: string, expected: readonly TokenKind[]): Option.Option<Expr> => {
    if (!stream.failed()) {
      stream.fail(
        `unexpected ${describe(stream)} while parsing ${place}. expecting ${quotes(expected)}`,
      );
    }
    return Option.none();
  };

const argEnd = (stream: Stream): Option.Option<boolean> => {
  if (stream.peek() !== "," && stream.peek() !== ")") {
    unexpected(stream)("arguments of function call", [",", ")"]);
    return Option.none();
  }
  return Option.some(stream.next().kind === ")");
};

const parseArgs =
  (parseOr: Parse) =>
  (stream: Stream): Option.Option<readonly Expr[]> => {
    const args: Expr[] = [];
    if (stream.peek() === ")") {
      stream.next();
      return Option.some(args);
    }
    for (;;) {
      const closed = pipe(
        parseOr(stream),
        Option.flatMap((arg) => {
          args.push(arg);
          return argEnd(stream);
        }),
      );
      if (Option.isNone(closed) || closed.value) {
        return Option.as(closed, args);
      }
    }
  };

const parseIdent =
  (parseOr: Parse) =>
  (stream: Stream): Option.Option<Expr> => {
    const token = stream.next();
    if (stream.peek() === "(") {
      stream.next();
      return pipe(
        parseArgs(parseOr)(stream),
        Option.map((args): Expr => ({ type: "call", callee: token.value, args, token })),
      );
    }
    if (token.value === "null") {
      return Option.some({ type: "null", token });
    }
    if (token.value === "true" || token.value === "false") {
      return Option.some({ type: "bool", token });
    }
    return Option.some({ type: "variable", name: Str.toLowerCase(token.value), token });
  };

const parseNested =
  (parseOr: Parse) =>
  (stream: Stream): Option.Option<Expr> => {
    stream.next();
    const nested = parseOr(stream);
    if (Option.isNone(nested)) {
      return nested;
    }
    if (stream.peek() !== ")") {
      return unexpected(stream)("closing ')' of nested expression (...)", [")"]);
    }
    stream.next();
    return nested;
  };

const parseInt = (stream: Stream): Option.Option<Expr> => {
  const text = stream.current().value;
  return Option.match(intLiteralError(text), {
    onNone: () => Option.some<Expr>({ type: "int", token: stream.next() }),
    onSome: (error) => {
      stream.fail(`parsing invalid integer literal ${quote(text)}: ${error}`);
      return Option.none();
    },
  });
};

const parseFloat = (stream: Stream): Option.Option<Expr> => {
  const text = stream.current().value;
  if (Number.isFinite(Number(text))) {
    return Option.some({ type: "float", token: stream.next() });
  }
  stream.fail(
    `parsing invalid float literal ${quote(text)}: strconv.ParseFloat: parsing ${quote(text)}: value out of range`,
  );
  return Option.none();
};

const parseString = (stream: Stream): Option.Option<Expr> => {
  const token = stream.next();
  const inner = Str.replaceAll(STRING_DELIMITERS, "")(token.value);
  return Option.some({ type: "string", value: Str.replaceAll(ESCAPED_QUOTE, QUOTE)(inner), token });
};

const PARSERS: Readonly<Record<string, (parseOr: Parse) => Parse>> = {
  IDENT: parseIdent,
  "(": parseNested,
  INTEGER: () => parseInt,
  FLOAT: () => parseFloat,
  STRING: () => parseString,
};

export const parsePrimary =
  (parseOr: Parse) =>
  (stream: Stream): Option.Option<Expr> =>
    pipe(
      Rec.get(PARSERS, stream.peek()),
      Option.match({
        onNone: () =>
          unexpected(stream)(
            "variable access, function call, null, bool, int, float or string",
            PRIMARY,
          ),
        onSome: (parser) => parser(parseOr)(stream),
      }),
    );

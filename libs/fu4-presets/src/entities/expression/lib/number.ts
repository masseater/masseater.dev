import { Result, pipe } from "effect";

import type { TokenKind } from "#/entities/expression/model/ast.ts";

import { advance, isAlnum, isChar, isHex, peek, textOf } from "./cursor.ts";
import type { Cursor, Scan } from "./cursor.ts";
import { DIGITS, PUNCT, digitsFrom, finished, optionally, skipWhile, unexpected } from "./lexed.ts";
import type { Lexed } from "./lexed.ts";

interface Num {
  readonly at: Cursor;
  readonly float: boolean;
}

const fraction =
  (scan: Scan) =>
  (num: Num): Result.Result<Num, Lexed> => {
    if (!isChar(".")(peek(scan.src)(num.at))) {
      return Result.succeed(num);
    }
    return pipe(
      digitsFrom("fraction part of float number")(scan)(advance(scan.src)(num.at)),
      Result.map((at): Num => ({ at, float: true })),
    );
  };

const exponentDigits =
  (scan: Scan) =>
  (at: Cursor): Result.Result<Cursor, Lexed> => {
    if (isChar("0")(peek(scan.src)(at))) {
      return Result.succeed(advance(scan.src)(at));
    }
    return digitsFrom("exponent part of float number")(scan)(at);
  };

const exponent =
  (scan: Scan) =>
  (num: Num): Result.Result<Num, Lexed> => {
    const char = peek(scan.src)(num.at);
    if (!isChar("e")(char) && !isChar("E")(char)) {
      return Result.succeed(num);
    }
    return pipe(
      advance(scan.src)(num.at),
      optionally("-")(scan),
      exponentDigits(scan),
      Result.map((at): Num => ({ at, float: true })),
    );
  };

const trailing =
  (scan: Scan, what: string) =>
  (at: Cursor): Result.Result<Cursor, Lexed> => {
    if (isAlnum(peek(scan.src)(at))) {
      return Result.fail(
        unexpected(scan)({
          at,
          place: `character following ${what} ${textOf(scan)(at)}`,
          expected: PUNCT,
        }),
      );
    }
    return Result.succeed(at);
  };

const lexHex = (scan: Scan, from: Cursor): Lexed => {
  const digits = pipe(
    Result.succeed(from),
    Result.flatMap((at) => {
      if (isChar("0")(peek(scan.src)(at))) {
        return Result.succeed(advance(scan.src)(at));
      }
      if (!isHex(peek(scan.src)(at))) {
        return Result.fail(
          unexpected(scan)({ at, place: "hex integer", expected: `${DIGITS}, 'a'..'f', 'A'..'F'` }),
        );
      }
      return Result.succeed(skipWhile(isHex)(scan.src)(at));
    }),
    Result.flatMap(trailing(scan, "hex integer")),
  );
  return Result.match(digits, {
    onFailure: (lexed) => lexed,
    onSuccess: (end) => finished(scan)("INTEGER", end),
  });
};

const integerPart = (scan: Scan, at: Cursor): Result.Result<Num, Lexed> =>
  pipe(
    digitsFrom("integer part of number")(scan)(at),
    Result.map((end): Num => ({ at: end, float: false })),
  );

const integerOf = (scan: Scan, at: Cursor): Result.Result<Num, Lexed> => {
  if (isChar("0")(peek(scan.src)(at))) {
    return Result.succeed({ at: advance(scan.src)(at), float: false });
  }
  return integerPart(scan, at);
};

const kindOf = (num: Num): TokenKind => {
  if (num.float) {
    return "FLOAT";
  }
  return "INTEGER";
};

const lexDecimal = (scan: Scan, at: Cursor): Lexed => {
  const number = pipe(
    integerOf(scan, at),
    Result.flatMap(fraction(scan)),
    Result.flatMap(exponent(scan)),
    Result.flatMap((num) =>
      pipe(
        trailing(scan, "number")(num.at),
        Result.map((end): Num => ({ at: end, float: num.float })),
      ),
    ),
  );
  return Result.match(number, {
    onFailure: (lexed) => lexed,
    onSuccess: (num) => finished(scan)(kindOf(num), num.at),
  });
};

export const lexNum = (scan: Scan): Lexed => {
  const at = optionally("-")(scan)(scan.start);
  const next = advance(scan.src)(at);
  if (isChar("0")(peek(scan.src)(at)) && isChar("x")(peek(scan.src)(next))) {
    return lexHex(scan, advance(scan.src)(next));
  }
  return lexDecimal(scan, at);
};

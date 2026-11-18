import { Result } from "effect";
import { expect, test } from "vite-plus/test";

import type { Expr } from "#/entities/expression/model/ast.ts";

import { parse } from "./parser.ts";

const END_MARKER = 4;

const tree = (src: string): Expr => Result.getOrThrow(parse(src).result);

const variable = (name: string): object => ({ type: "variable", name });

const message = (src: string): string =>
  Result.match(parse(src).result, { onFailure: (error) => error.message, onSuccess: () => "" });

test("binds && tighter than || and comparisons tighter than &&", () => {
  expect(tree("a || b && c == 1 }}")).toMatchObject({
    type: "logical",
    op: "||",
    left: variable("a"),
    right: {
      type: "logical",
      op: "&&",
      left: variable("b"),
      right: { type: "compare", op: "==", left: variable("c"), right: { type: "int" } },
    },
  });
});

test("reads property, array and index dereferences left to right", () => {
  expect(tree("!Github.Event.commits.*[0] }}")).toMatchObject({
    type: "not",
    operand: {
      type: "index",
      index: { type: "int" },
      operand: {
        type: "array-deref",
        receiver: {
          type: "object-deref",
          property: "commits",
          receiver: { type: "object-deref", property: "event", receiver: variable("github") },
        },
      },
    },
  });
});

test("parses calls, nesting and escaped quotes in strings", () => {
  expect(tree("contains(fromJSON('[''x'']'), (a)) }}")).toMatchObject({
    type: "call",
    callee: "contains",
    args: [
      { type: "call", callee: "fromJSON", args: [{ type: "string", value: "['x']" }] },
      variable("a"),
    ],
  });
});

test("reports the offset just past the end marker", () => {
  expect(parse("a }} b").offset).toBe(END_MARKER);
});

test("reports tokens left after the expression", () => {
  expect(message("a b ( }}")).toBe(
    'parser did not reach end of input after parsing the expression. 2 remaining token(s) in the input: "IDENT", "("',
  );
});

test("prefers a lexer error over a parser error", () => {
  expect(message("a ==")).toBe("unexpected EOF while lexing expression");
});

test("rejects integers outside the 32-bit range", () => {
  expect(message("2147483648 }}")).toBe(
    'parsing invalid integer literal "2147483648": strconv.ParseInt: parsing "2147483648": value out of range',
  );
});

test("names the expected tokens after a dot", () => {
  expect(message("a.1 }}")).toMatch(
    /^unexpected token "INTEGER" while parsing object property dereference/u,
  );
});

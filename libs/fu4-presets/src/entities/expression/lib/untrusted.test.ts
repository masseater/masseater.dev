import { Array as Arr, Result } from "effect";
import { expect, test } from "vite-plus/test";

import type { Expr } from "#/entities/expression/model/ast.ts";

import { parse } from "./parser.ts";
import { untrusted } from "./untrusted.ts";
import type { Untrusted } from "./untrusted.ts";

const operandsOf = (expr: Expr): readonly Expr[] => {
  if (expr.type === "compare" || expr.type === "logical") {
    return [expr.left, expr.right];
  }
  if (expr.type === "call") {
    return expr.args;
  }
  return [];
};

const childrenOf = (expr: Expr): readonly Expr[] => {
  if (expr.type === "object-deref" || expr.type === "array-deref") {
    return [expr.receiver];
  }
  if (expr.type === "index") {
    return [expr.index, expr.operand];
  }
  if (expr.type === "not") {
    return [expr.operand];
  }
  return operandsOf(expr);
};

const walk =
  (checker: Untrusted) =>
  (expr: Expr): void => {
    checker.enter(expr);
    for (const child of childrenOf(expr)) {
      walk(checker)(child);
    }
    checker.leave(expr);
  };

const errorsOf = (src: string): readonly string[] => {
  const checker = untrusted();
  walk(checker)(Result.getOrThrow(parse(src).result));
  return Arr.map(checker.finish(), (found) => found.message);
};

test("detects direct access", () => {
  expect(errorsOf("github.event.issue.title }}")).toStrictEqual([
    expect.stringMatching(/^"github\.event\.issue\.title" is potentially untrusted/u),
  ]);
});

test("detects array and filter access", () => {
  expect(errorsOf("github.event.commits[0].message }}")).toStrictEqual([
    expect.stringMatching(/^"github\.event\.commits\.\*\.message" is potentially untrusted/u),
  ]);
  expect(errorsOf("github.event.commits.*.author }}")).toStrictEqual([]);
  expect(errorsOf("github.event.commits.*.author.* }}")).toStrictEqual([
    expect.stringContaining(
      '"github.event.commits.*.author.email", "github.event.commits.*.author.name"',
    ),
  ]);
});

test("ignores safe calls and trusted properties", () => {
  expect(errorsOf("contains(github.event.issue.title, 'x') }}")).toStrictEqual([]);
  expect(errorsOf("github.event.issue.number }}")).toStrictEqual([]);
});

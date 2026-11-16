import { Array as Arr, pipe } from "effect";
import type { AstNode } from "langium";

export interface Problem {
  readonly node: AstNode;
  readonly property: string;
  readonly message: string;
}

export interface Compiled<Value> {
  readonly value: Value;
  readonly problems: readonly Problem[];
}

export type From<Node, Result> = (node: Node) => Result;

export type Combine<Value> = (left: Value, right: Value) => Value;

export const problemAt: From<AstNode, From<string, From<string, Problem>>> =
  (node) => (property) => (message) => ({ node, property, message });

export const problemsOf: From<readonly Compiled<unknown>[], readonly Problem[]> = (items) =>
  pipe(
    items,
    Arr.flatMap((item) => item.problems),
  );

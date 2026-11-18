import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { fieldOf, fieldsOf } from "#/shared/syntax/index.ts";

import type { Analysis, Execute } from "./analysis.ts";
import { joinAll, mergeAll, scopeOf, setStatus } from "./scope.ts";
import type { Scope, Status } from "./scope.ts";
import { valueStatus } from "./values.ts";

const CLAUSES = new Set(["elif_clause", "else_clause"]);

interface Split {
  readonly condition: readonly SyntaxNode[];
  readonly body: readonly SyntaxNode[];
}

const isStatement = (child: SyntaxNode): boolean => child.named && !CLAUSES.has(child.type);

const splitAtThen = (node: SyntaxNode): Split => {
  const index = pipe(
    node.children,
    Arr.findFirstIndex((child) => !child.named && child.type === "then"),
    Option.getOrElse(() => node.children.length),
  );
  return {
    condition: pipe(node.children, Arr.take(index), Arr.filter(isStatement)),
    body: pipe(node.children, Arr.drop(index), Arr.filter(isStatement)),
  };
};

interface Clauses {
  readonly analysis: Analysis;
  readonly node: SyntaxNode;
  readonly tested: Option.Option<Scope>;
}

const clauseOutcomes = ({ analysis, node, tested }: Clauses): readonly Option.Option<Scope>[] => {
  let current = tested;
  const outcomes: Option.Option<Scope>[] = [];
  for (const clause of node.namedChildren) {
    if (clause.type === "elif_clause") {
      const split = splitAtThen(clause);
      current = analysis.block(current, split.condition);
      outcomes.push(analysis.block(current, split.body));
    }
  }
  const otherwise = pipe(
    node.namedChildren,
    Arr.findFirst((clause) => clause.type === "else_clause"),
    Option.match({
      onNone: () => current,
      onSome: (clause) => analysis.block(current, clause.namedChildren),
    }),
  );
  return [...outcomes, otherwise];
};

const branch: Execute = (analysis, flow, node) => {
  const { condition, body } = splitAtThen(node);
  const tested = analysis.block(flow, condition);
  return joinAll([analysis.block(tested, body), ...clauseOutcomes({ analysis, node, tested })]);
};

const bodyOf = (node: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    fieldOf("body")(node),
    Option.map((body) => body.namedChildren),
    Option.getOrElse((): readonly SyntaxNode[] => []),
  );

const loop: Execute = (analysis, flow, node) => {
  const conditions = fieldsOf("condition")(node);
  const body = bodyOf(node);
  const first = analysis.block(flow, conditions);
  const looped = analysis.block(first, body);
  const second = analysis.block(joinAll([first, looped]), conditions);
  analysis.block(second, body);
  return joinAll([first, second]);
};

const valuesStatus = (flow: Option.Option<Scope>, values: readonly SyntaxNode[]): Status => {
  if (!Arr.isReadonlyArrayNonEmpty(values)) {
    return "dirty";
  }
  const statusIn = valueStatus(scopeOf(flow));
  return mergeAll(pipe(values, Arr.map(statusIn)));
};

const forIn: Execute = (analysis, flow, node) => {
  const values = fieldsOf("value")(node);
  for (const value of values) {
    analysis.scan(flow, value);
  }
  const change = {
    name: pipe(
      fieldOf("variable")(node),
      Option.map((found) => found.text),
      Option.getOrElse(() => ""),
    ),
    status: valuesStatus(flow, values),
  };
  const body = bodyOf(node);
  const entry = setStatus(change)(flow);
  const looped = analysis.block(entry, body);
  const again = analysis.block(joinAll([entry, setStatus(change)(looped)]), body);
  return joinAll([flow, looped, again]);
};

const cStyleFor: Execute = (analysis, flow, node) => {
  for (const child of node.namedChildren) {
    if (child.field !== "body") {
      analysis.scan(flow, child);
    }
  }
  const body = bodyOf(node);
  const looped = analysis.block(flow, body);
  const again = analysis.block(joinAll([flow, looped]), body);
  return joinAll([flow, looped, again]);
};

const caseOf: Execute = (analysis, flow, node) => {
  for (const value of fieldsOf("value")(node)) {
    analysis.scan(flow, value);
  }
  const outcomes = [flow];
  for (const item of node.namedChildren) {
    if (item.type === "case_item") {
      for (const value of fieldsOf("value")(item)) {
        analysis.scan(flow, value);
      }
      const statements = pipe(
        item.namedChildren,
        Arr.filter((child) => child.field !== "value"),
      );
      outcomes.push(analysis.block(flow, statements));
    }
  }
  return joinAll(outcomes);
};

const redirected: Execute = (analysis, flow, node) => {
  for (const redirect of fieldsOf("redirect")(node)) {
    analysis.scan(flow, redirect);
  }
  return Option.match(fieldOf("body")(node), {
    onNone: () => flow,
    onSome: (body) => analysis.exec(flow, body),
  });
};

const list: Execute = (analysis, flow, node) => {
  const [left, right] = node.namedChildren;
  const first = Option.match(Option.fromNullishOr(left), {
    onNone: () => flow,
    onSome: (found) => analysis.exec(flow, found),
  });
  const second = Option.match(Option.fromNullishOr(right), {
    onNone: () => first,
    onSome: (found) => analysis.exec(first, found),
  });
  return joinAll([first, second]);
};

export const STATEMENT_HANDLERS: ReadonlyMap<string, Execute> = new Map<string, Execute>([
  ["if_statement", branch],
  ["while_statement", loop],
  ["for_statement", forIn],
  ["c_style_for_statement", cStyleFor],
  ["case_statement", caseOf],
  ["redirected_statement", redirected],
  ["list", list],
]);

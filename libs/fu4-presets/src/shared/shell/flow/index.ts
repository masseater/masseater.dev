import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { makeAnalysis } from "./analysis.ts";
import type { Execute } from "./analysis.ts";
import { ASSIGN_HANDLERS } from "./assign.ts";
import { CALL_HANDLERS } from "./calls.ts";
import { initialScope, setAll } from "./scope.ts";
import type { Scope } from "./scope.ts";
import { STATEMENT_HANDLERS } from "./statements.ts";

const sequence: Execute = (analysis, flow, node) => analysis.block(flow, node.namedChildren);

const unset: Execute = (analysis, flow, node) => {
  analysis.scan(flow, node);
  return setAll(
    pipe(
      node.namedChildren,
      Arr.filter((child) => child.type === "variable_name"),
      Arr.map((child) => ({ name: child.text, status: "dirty" as const })),
    ),
  )(flow);
};

const isolated: Execute = (analysis, flow, node) => {
  for (const child of node.namedChildren) {
    analysis.exec(flow, child);
  }
  return flow;
};

const subshell: Execute = (analysis, flow, node) => {
  sequence(analysis, flow, node);
  return flow;
};

const scanOnly: Execute = (analysis, flow, node) => {
  analysis.scan(flow, node);
  return flow;
};

const HANDLERS: ReadonlyMap<string, Execute> = new Map<string, Execute>([
  ["comment", (_analysis, flow): Option.Option<Scope> => flow],
  ["program", sequence],
  ["compound_statement", sequence],
  ["do_group", sequence],
  ["variable_assignments", sequence],
  ["negated_command", sequence],
  ["unset_command", unset],
  ["pipeline", isolated],
  ["subshell", subshell],
  ...ASSIGN_HANDLERS,
  ...CALL_HANDLERS,
  ...STATEMENT_HANDLERS,
]);

const execute: Execute = (analysis, flow, node) =>
  pipe(
    Option.fromNullishOr(HANDLERS.get(node.type)),
    Option.getOrElse(() => scanOnly),
  )(analysis, flow, node);

export const cleanReads = (root: SyntaxNode): ReadonlySet<number> => {
  const analysis = makeAnalysis(execute);
  analysis.exec(Option.some(initialScope()), root);
  return analysis.cleanReads();
};

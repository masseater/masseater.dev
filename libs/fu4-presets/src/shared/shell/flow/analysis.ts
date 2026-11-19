import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { scopeOf } from "./scope.ts";
import type { Scope } from "./scope.ts";
import { isCleanRead } from "./values.ts";

export interface Analysis {
  readonly exec: (flow: Option.Option<Scope>, node: SyntaxNode) => Option.Option<Scope>;
  readonly block: (
    flow: Option.Option<Scope>,
    statements: readonly SyntaxNode[],
  ) => Option.Option<Scope>;
  readonly scan: (flow: Option.Option<Scope>, node: SyntaxNode) => void;
  readonly define: (name: string, body: SyntaxNode) => void;
  readonly bodyOf: (name: string) => Option.Option<SyntaxNode>;
  readonly isCalling: (name: string) => boolean;
  readonly enter: (name: string) => void;
  readonly leave: (name: string) => ReadonlySet<string>;
  readonly addLocal: (name: string) => void;
  readonly inFunction: () => boolean;
  readonly cleanReads: () => ReadonlySet<number>;
}

export type Execute = (
  analysis: Analysis,
  flow: Option.Option<Scope>,
  node: SyntaxNode,
) => Option.Option<Scope>;

const EXPANSIONS = new Set(["simple_expansion", "expansion"]);
const SUBSHELLS = new Set(["command_substitution", "process_substitution"]);

type Calls = Pick<
  Analysis,
  "define" | "bodyOf" | "isCalling" | "enter" | "leave" | "addLocal" | "inFunction"
>;

const callsOf = (): Calls => {
  const functions = new Map<string, SyntaxNode>();
  const calling = new Set<string>();
  const frames: Set<string>[] = [];
  return {
    define: (name, body) => {
      functions.set(name, body);
    },
    bodyOf: (name) => Option.fromNullishOr(functions.get(name)),
    isCalling: (name) => calling.has(name),
    enter: (name) => {
      calling.add(name);
      frames.push(new Set());
    },
    leave: (name) => {
      calling.delete(name);
      return frames.pop() ?? new Set();
    },
    addLocal: (name) => {
      for (const frame of Option.toArray(Arr.last(frames))) {
        frame.add(name);
      }
    },
    inFunction: () => Arr.isArrayNonEmpty(frames),
  };
};

interface Reads {
  readonly record: (node: SyntaxNode, clean: boolean) => void;
  readonly cleanReads: () => ReadonlySet<number>;
}

const readsOf = (): Reads => {
  const reads = new Map<number, boolean>();
  return {
    record: (node, clean) => {
      reads.set(node.id, (reads.get(node.id) ?? true) && clean);
    },
    cleanReads: () =>
      new Set(
        pipe(
          Arr.fromIterable(reads),
          Arr.filter(([, clean]) => clean),
          Arr.map(([id]) => id),
        ),
      ),
  };
};

const scanWith =
  (analysis: Analysis, reads: Reads, scope: Scope) =>
  (node: SyntaxNode): void => {
    if (SUBSHELLS.has(node.type)) {
      analysis.block(Option.some(scope), node.namedChildren);
      return;
    }
    if (EXPANSIONS.has(node.type)) {
      reads.record(node, isCleanRead(scope)(node));
    }
    for (const child of node.namedChildren) {
      scanWith(analysis, reads, scope)(child);
    }
  };

export const makeAnalysis = (execute: Execute): Analysis => {
  const reads = readsOf();
  const analysis: Analysis = {
    ...callsOf(),
    exec: (flow, node) => execute(analysis, flow, node),
    block: (flow, statements) => {
      let current = flow;
      for (const statement of statements) {
        current = execute(analysis, current, statement);
      }
      return current;
    },
    scan: (flow, node) => {
      scanWith(analysis, reads, scopeOf(flow))(node);
    },
    cleanReads: reads.cleanReads,
  };
  return analysis;
};

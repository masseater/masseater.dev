import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { CODES } from "./codes.ts";
import type { CodeName } from "./codes.ts";

const TAB_WIDTH = 8;
const FIRST = 1;
const NONE = 0;

export interface Finding {
  readonly code: CodeName;
  readonly line: number;
  readonly column: number;
  readonly subject: string;
}

export interface State {
  readonly source: string;
  readonly cleanReads: ReadonlySet<number>;
  readonly add: (finding: Finding) => void;
  readonly assign: (finding: Finding) => void;
  readonly use: (name: string) => void;
}

const advance = (column: number, char: string): number => {
  if (char === "\t") {
    return column + TAB_WIDTH - (column % TAB_WIDTH);
  }
  return column + FIRST;
};

const widthOf = (text: string): number => {
  let column = NONE;
  for (const char of text) {
    column = advance(column, char);
  }
  return column;
};

export interface At {
  readonly state: State;
  readonly code: CodeName;
}

export const findingAt =
  ({ state, code }: At) =>
  (node: SyntaxNode, subject: string): Finding => {
    const lines = Str.split("\n")(Str.slice(NONE, node.start)(state.source));
    const last = Option.getOrElse(Arr.last(lines), () => "");
    return { code, line: lines.length, column: widthOf(last) + FIRST, subject };
  };

export const report =
  (at: At) =>
  (node: SyntaxNode): void => {
    at.state.add(findingAt(at)(node, ""));
  };

export const messageOf = (finding: Finding): string => {
  const { message } = CODES[finding.code];
  if (Str.isEmpty(finding.subject)) {
    return message;
  }
  return `${finding.subject} ${message}`;
};

const ORDER = Rec.keys(CODES);

const rankOf = (finding: Finding): number =>
  pipe(
    ORDER,
    Arr.findFirstIndex((code) => code === finding.code),
    Option.getOrElse(() => NONE),
  );

const byLine = Order.mapInput(Order.Number, (finding: Finding) => finding.line);
const byColumn = Order.mapInput(Order.Number, (finding: Finding) => finding.column);
const byCode = Order.mapInput(Order.Number, rankOf);
const byPosition = pipe(byLine, Order.combine(byColumn), Order.combine(byCode));

export const sortedFindings = (findings: readonly Finding[]): readonly Finding[] =>
  Arr.sort(findings, byPosition);

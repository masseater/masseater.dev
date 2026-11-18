import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { pointOf } from "./document.ts";
import type { Document, Point } from "./document.ts";
import { isComment } from "./nodes.ts";

const NONE = 0;
const NEXT = 1;
const SPACES = /^ *$/u;

const indentStart = (before: string, lineStart: number, fallback: number): number => {
  if (SPACES.test(Str.slice(lineStart)(before))) {
    return lineStart;
  }
  return fallback;
};

export interface Span {
  readonly start: Point;
  readonly end: Point;
}

export const spanOf =
  (document: Document) =>
  (node: SyntaxNode): Span => ({
    start: pointOf(document)(node.start),
    end: pointOf(document)(node.end),
  });

export const withLeadingWhitespace =
  (document: Document) =>
  (node: SyntaxNode): string => {
    const before = Str.slice(NONE, node.start)(document.text);
    const lineStart = Option.match(Str.lastIndexOf("\n")(before), {
      onNone: () => node.start,
      onSome: (index) => index + NEXT,
    });
    const start = indentStart(before, lineStart, node.start);
    return Str.slice(start, node.end)(document.text);
  };

const trawl =
  (document: Document, rows: Span) =>
  (node: SyntaxNode): readonly SyntaxNode[] => {
    const span = spanOf(document)(node);
    if (span.end.row < rows.start.row || span.start.row > rows.end.row) {
      return [];
    }
    const own = pipe(
      node.namedChildren,
      Arr.filter((child) => {
        const at = spanOf(document)(child);
        return isComment(child) && at.start.row >= rows.start.row && at.end.row <= rows.end.row;
      }),
    );
    return [...own, ...pipe(node.children, Arr.flatMap(trawl(document, rows)))];
  };

export const featureComments =
  (document: Document) =>
  (node: SyntaxNode): readonly SyntaxNode[] =>
    trawl(document, spanOf(document)(node))(document.root);

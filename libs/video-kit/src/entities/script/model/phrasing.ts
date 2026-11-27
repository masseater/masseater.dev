import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Nodes } from "mdast";

import { NOTHING, ONE } from "#/shared/config/index.ts";

import { ATTRIBUTES } from "./attributes.ts";
import type { Line, Segment } from "./script.ts";

type Token = Readonly<{ kind: "segment"; segment: Segment }> | Readonly<{ kind: "break" }>;

const BREAK: Token = { kind: "break" };
const NEWLINE = "\n";
const EMPTY = "";
const NO_TOKENS: readonly Token[] = [];
const NO_SEGMENTS: readonly Segment[] = [];

export const textOfNodes = (nodes: readonly Nodes[]): string =>
  pipe(
    nodes,
    Arr.map((node) => {
      if (node.type === "text" || node.type === "inlineCode") {
        return node.value;
      }
      if ("children" in node) {
        return textOfNodes(node.children);
      }
      return EMPTY;
    }),
    Arr.join(EMPTY),
  );

const breakBefore = (position: number): readonly Token[] => {
  if (position > NOTHING) {
    return [BREAK];
  }
  return NO_TOKENS;
};

const segmentOf = (text: string, emphasis: boolean): readonly Token[] => {
  if (Str.isEmpty(text)) {
    return NO_TOKENS;
  }
  return [{ kind: "segment", segment: { text, code: false, emphasis } }];
};

const textTokens = (value: string, emphasis: boolean): readonly Token[] =>
  pipe(
    Str.split(NEWLINE)(value),
    Arr.flatMap((part, position) => [...breakBefore(position), ...segmentOf(part, emphasis)]),
  );

const tokensOf = (nodes: readonly Nodes[], emphasis: boolean): readonly Token[] =>
  pipe(
    nodes,
    Arr.flatMap((node): readonly Token[] => {
      if (node.type === "inlineCode") {
        return [{ kind: "segment", segment: { text: node.value, code: true, emphasis } }];
      }
      if (node.type === "break") {
        return [BREAK];
      }
      if (node.type === "text") {
        return textTokens(node.value, emphasis);
      }
      if ("children" in node) {
        return tokensOf(node.children, emphasis || node.type === "strong");
      }
      return NO_TOKENS;
    }),
  );

const splitLines = (tokens: readonly Token[]): readonly (readonly Segment[])[] => {
  const groups: Segment[][] = [];
  let current: Segment[] = [];
  for (const token of tokens) {
    if (token.kind === "break") {
      groups.push(current);
      current = [];
    } else {
      current.push(token.segment);
    }
  }
  groups.push(current);
  return groups;
};

const hasWords = (segments: readonly Segment[]): boolean =>
  pipe(
    segments,
    Arr.some(({ text }) => Str.isNonEmpty(Str.trim(text))),
  );

export const linesOf = ({
  nodes,
  caption,
}: Readonly<{ nodes: readonly Nodes[]; caption: boolean }>): readonly Line[] =>
  pipe(
    splitLines(tokensOf(nodes, false)),
    Arr.filter(hasWords),
    Arr.map((segments) => ({ segments, caption })),
  );

const stripped = (last: Segment): readonly Segment[] => {
  const text = Str.trimEnd(Str.replace(ATTRIBUTES, EMPTY)(last.text));
  if (Str.isEmpty(text)) {
    return NO_SEGMENTS;
  }
  return [{ text, code: last.code, emphasis: last.emphasis }];
};

export const headingSegments = (children: readonly Nodes[]): readonly Segment[] => {
  const segments = pipe(
    linesOf({ nodes: children, caption: false }),
    Arr.flatMap((line) => line.segments),
  );
  return pipe(
    Arr.last(segments),
    Option.filter(({ code }) => !code),
    Option.match({
      onNone: () => segments,
      onSome: (last) => [...pipe(segments, Arr.dropRight(ONE)), ...stripped(last)],
    }),
  );
};

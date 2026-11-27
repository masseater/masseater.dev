import { aligned, wordAt } from "@masseater.dev/lint-host";

import type { NodeType } from "./index.ts";

const WORD = 4;
const EMPTY = 0;
const HEADER_WORDS = 5;
const HEADER = { nodes: 0, strings: 1, lines: 2, text: 3 } as const;
const STRING_WORDS = 2;
const LENGTH = 1;
export const NODE_WORDS = 8;

export const FIELD = {
  tag: 0,
  start: 1,
  end: 2,
  parent: 3,
  firstChild: 4,
  nextSibling: 5,
  first: 6,
  second: 7,
} as const;

export const TAGS: readonly NodeType[] = [
  "document",
  "paragraph",
  "heading",
  "blockQuote",
  "codeBlock",
  "htmlBlock",
  "list",
  "listItem",
  "footnoteDefinition",
  "table",
  "tableHead",
  "tableRow",
  "tableCell",
  "emphasis",
  "strong",
  "strikethrough",
  "link",
  "image",
  "text",
  "code",
  "html",
  "inlineHtml",
  "softBreak",
  "hardBreak",
  "thematicBreak",
  "math",
  "mathBlock",
  "footnoteReference",
  "taskListMarker",
  "other",
];

export interface SourceView {
  readonly nodeCount: number;
  readonly nodes: Uint32Array;
  readonly lineStarts: Uint32Array;
  readonly text: () => string;
  readonly slice: (start: number, end: number) => string;
  readonly stringAt: (index: number) => string;
}

const decoder = new TextDecoder();

const padded = (length: number): number => Math.ceil(length / WORD) * WORD;

const decode = (from: Uint8Array, start: number, end: number): string =>
  decoder.decode(from.subarray(start, end));

interface Layout {
  readonly nodeCount: number;
  readonly stringCount: number;
  readonly lineCount: number;
  readonly textLength: number;
}

const wordsOf =
  (buffer: Uint8Array) =>
  (at: number, count: number): Uint32Array =>
    new Uint32Array(buffer.buffer, buffer.byteOffset + at * WORD, count);

const layoutOf = (header: Uint32Array): Layout => ({
  nodeCount: wordAt(header)(HEADER.nodes),
  stringCount: wordAt(header)(HEADER.strings),
  lineCount: wordAt(header)(HEADER.lines),
  textLength: wordAt(header)(HEADER.text),
});

export const sourceView = (raw: Uint8Array): SourceView => {
  const buffer = aligned(raw);
  const words = wordsOf(buffer);
  const { nodeCount, stringCount, lineCount, textLength } = layoutOf(words(EMPTY, HEADER_WORDS));
  const stringsAt = HEADER_WORDS + nodeCount * NODE_WORDS;
  const linesAt = stringsAt + stringCount * STRING_WORDS;
  const textAt = (linesAt + lineCount) * WORD;
  const bytes = buffer.subarray(textAt, textAt + textLength);
  const strings = words(stringsAt, stringCount * STRING_WORDS);
  const blob = buffer.subarray(textAt + padded(textLength));
  return {
    nodeCount,
    nodes: words(HEADER_WORDS, nodeCount * NODE_WORDS),
    lineStarts: words(linesAt, lineCount),
    text: () => decoder.decode(bytes),
    slice: (start, end) => decode(bytes, start, end),
    stringAt: (index): string => {
      const offset = wordAt(strings)(index * STRING_WORDS);
      return decode(blob, offset, offset + wordAt(strings)(index * STRING_WORDS + LENGTH));
    },
  };
};

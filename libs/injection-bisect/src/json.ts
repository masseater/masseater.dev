import { Array as Arr, String as Str, pipe } from "effect";
import { parseTree, visit } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";

import type { Parser, Span, Unit } from "./parser.ts";
import { proseUnitsIn } from "./prose.ts";

const OPENING = /^\s*[[{]/u;

const QUOTE = '"'.length;

const FIRST = 0;

const COMMENT_MARK = "//".length;

const BLOCK_END = "*/".length;

const looksLikeJson = (text: string): boolean => {
  if (!OPENING.test(text)) {
    return false;
  }
  const errors: ParseError[] = [];
  parseTree(text, errors);
  return Arr.isArrayEmpty(errors);
};

const commentSpan = (text: string, start: number, end: number): Span => {
  if (Str.startsWith("//", start)(text)) {
    return { start: start + COMMENT_MARK, end };
  }
  return { start: start + COMMENT_MARK, end: end - BLOCK_END };
};

const jsonUnitsOf = (text: string): readonly Unit[] => {
  const spans: Span[] = [];
  visit(text, {
    onLiteralValue: (value: unknown, offset, length) => {
      if (typeof value === "string") {
        spans.push({ start: offset + QUOTE, end: offset + length - QUOTE });
      }
    },
    onComment: (offset, length) => {
      spans.push(commentSpan(text, offset, offset + length));
    },
  });
  return proseUnitsIn(text)(spans);
};

const jsonParser: Parser = {
  format: "json",
  extensions: [".json", ".jsonc", ".jsonld", ".geojson", ".har", ".webmanifest"],
  accepts: looksLikeJson,
  unitsOf: jsonUnitsOf,
};

const LINE = /[^\n]+/gu;

const MIN_RECORDS = 2;

const recordsOf = (text: string): readonly Span[] =>
  pipe(
    Array.from(Str.matchAll(LINE)(text), (match) => {
      const start = match.index ?? FIRST;
      return { start, end: start + match[FIRST].length };
    }),
    Arr.filter(({ start, end }) => pipe(text, Str.slice(start, end), Str.trim) !== ""),
  );

const looksLikeJsonLines = (text: string): boolean => {
  const records = recordsOf(text);
  return (
    records.length >= MIN_RECORDS &&
    pipe(
      records,
      Arr.every(({ start, end }) => looksLikeJson(Str.slice(start, end)(text))),
    )
  );
};

const jsonLinesParser: Parser = {
  format: "jsonl",
  aliases: ["ndjson"],
  extensions: [".jsonl", ".ndjson"],
  accepts: looksLikeJsonLines,
  unitsOf: (text) =>
    pipe(
      recordsOf(text),
      Arr.map(({ start, end }): Unit => ({ kind: "nested", format: "json", start, end })),
    ),
};

export { jsonLinesParser, jsonParser };

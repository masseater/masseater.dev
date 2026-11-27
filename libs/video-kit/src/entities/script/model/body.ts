import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Image, Nodes } from "mdast";

import { ONE } from "#/shared/config/index.ts";

import { linesOf, textOfNodes } from "./phrasing.ts";
import type { Line } from "./script.ts";

export type Body =
  | Readonly<{ kind: "points"; items: readonly Line[] }>
  | Readonly<{ kind: "code"; code: readonly string[] }>
  | Readonly<{ kind: "media"; src: string; alt: string }>
  | Readonly<{ kind: "quote"; text: string; source: Option.Option<string> }>
  | Readonly<{ kind: "rating"; score: number; max: number }>;

const NEWLINE = "\n";
const EMPTY = "";
const FULL_STAR = "★";
const STARS = /^[★☆]+$/u;
const QUOTE_SOURCE = /^[—―-]\s*/u;
const NO_LINES: readonly Line[] = [];
const NO_ROWS: readonly string[] = [];

const paragraphLines = (node: Nodes): readonly Line[] => {
  if (node.type === "paragraph") {
    return linesOf({ nodes: node.children, caption: false });
  }
  return NO_LINES;
};

const paragraphRows = (node: Nodes): readonly string[] => {
  if (node.type === "paragraph") {
    return Str.split(NEWLINE)(textOfNodes(node.children));
  }
  return NO_ROWS;
};

const childrenOf = (node: Nodes): readonly Nodes[] => {
  if ("children" in node) {
    return node.children;
  }
  return [];
};

const ratingOf = (text: string): Body => {
  const stars = Arr.fromIterable(text);
  return {
    kind: "rating",
    score: pipe(
      stars,
      Arr.filter((star) => star === FULL_STAR),
    ).length,
    max: stars.length,
  };
};

const quoteOf = (rows: readonly string[]): Body => {
  const source = pipe(
    Arr.last(rows),
    Option.filter((last) => rows.length > ONE && QUOTE_SOURCE.test(last)),
  );
  const shown = Option.match(source, {
    onNone: () => rows,
    onSome: () => pipe(rows, Arr.dropRight(ONE)),
  });
  return {
    kind: "quote",
    text: pipe(shown, Arr.join(NEWLINE)),
    source: pipe(source, Option.map(Str.replace(QUOTE_SOURCE, EMPTY))),
  };
};

const isImage = (node: Nodes): node is Image => node.type === "image";

const mediaOf = (children: readonly Nodes[]): Option.Option<Body> =>
  pipe(
    Arr.head(children),
    Option.filter(() => children.length === ONE),
    Option.filter(isImage),
    Option.map((image): Body => ({
      kind: "media",
      src: image.url,
      alt: Option.getOrElse(Option.fromNullishOr(image.alt), () => EMPTY),
    })),
  );

const paragraphBody = (children: readonly Nodes[]): Option.Option<Body> => {
  const text = Str.trim(textOfNodes(children));
  if (STARS.test(text)) {
    return Option.some(ratingOf(text));
  }
  return mediaOf(children);
};

export const bodyOf = (block: Nodes): Option.Option<Body> => {
  if (block.type === "list") {
    return Option.some({
      kind: "points",
      items: pipe(block.children, Arr.flatMap(childrenOf), Arr.flatMap(paragraphLines)),
    });
  }
  if (block.type === "code") {
    return Option.some({ kind: "code", code: Str.split(NEWLINE)(block.value) });
  }
  if (block.type === "paragraph") {
    return paragraphBody(block.children);
  }
  if (block.type === "blockquote") {
    const rows = pipe(block.children, Arr.flatMap(paragraphRows));
    return Option.some(quoteOf(rows));
  }
  return Option.none();
};

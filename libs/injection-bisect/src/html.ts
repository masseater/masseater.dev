import { Array as Arr, Match, Option, Order, String as Str, pipe } from "effect";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import type { Parser, Span } from "./parser.ts";
import { looksLikeProse } from "./prose.ts";

type Node = DefaultTreeAdapterMap["node"];

type Element = DefaultTreeAdapterMap["element"];

const TAG = /<(?:[a-z][\w-]*[\s/>]|\/[a-z]|!--|!doctype)/iu;

const COMMENT_OPEN = "<!--".length;

const COMMENT_CLOSE = "-->".length;

const LINE_BY_LINE = new Set(["script", "style"]);

const MARKUP_ATTRIBUTES = new Set([
  "class",
  "style",
  "srcset",
  "sizes",
  "d",
  "points",
  "transform",
]);

const QUOTE = /["']/u;

const NOT_FOUND = -1;

const NO_SPANS: readonly Span[] = [];

const looksLikeHtml = (text: string): boolean => TAG.test(text);

const linesIn = (text: string, { start, end }: Span): readonly Span[] => {
  const spans: Span[] = [];
  let from = start;
  for (const line of pipe(text, Str.slice(start, end), Str.split("\n"))) {
    if (Str.trim(line) !== "") {
      spans.push({ start: from, end: from + line.length });
    }
    from += line.length + "\n".length;
  }
  return spans;
};

const valueSpan = (text: string, { start, end }: Span): Span => {
  const equals =
    pipe(
      Str.slice(start)(text),
      Str.indexOf("="),
      Option.match({ onNone: () => NOT_FOUND, onSome: (at) => at + start }),
    ) + "=".length;
  const value = Str.slice(equals, end)(text);
  const leading = Option.getOrElse(Str.search(/\S/u)(value), () => NOT_FOUND) + equals;
  if (QUOTE.test(text[leading] ?? "")) {
    return { start: leading + "'".length, end: end - "'".length };
  }
  return { start: leading, end };
};

const attributeSpans = (text: string, element: Element): readonly Span[] =>
  pipe(
    element.attrs,
    Arr.flatMap(({ name, value }) =>
      Option.fromNullishOr(element.sourceCodeLocation).pipe(
        Option.flatMapNullishOr((location) => location.attrs),
        Option.flatMapNullishOr((attrs) => attrs[name]),
        Option.filter(() => !MARKUP_ATTRIBUTES.has(name) && looksLikeProse(value)),
        Option.map(({ startOffset, endOffset }) =>
          valueSpan(text, { start: startOffset, end: endOffset }),
        ),
        Option.toArray,
      ),
    ),
  );

const locationOf = (node: Node): Option.Option<Span> =>
  Option.fromNullishOr(node.sourceCodeLocation).pipe(
    Option.map(({ startOffset, endOffset }) => ({ start: startOffset, end: endOffset })),
  );

const parentTagOf = (node: Node): string =>
  Match.value(node).pipe(
    Match.when({ parentNode: Match.defined }, ({ parentNode }) =>
      Option.getOrElse(
        Option.map(Option.fromNullishOr(parentNode), ({ nodeName }) => nodeName),
        () => "",
      ),
    ),
    Match.orElse(() => ""),
  );

const ownSpans = (text: string, node: Node): readonly Span[] =>
  Match.value(node).pipe(
    Match.when({ nodeName: "#comment" }, (comment) =>
      Option.match(locationOf(comment), {
        onNone: () => NO_SPANS,
        onSome: ({ start, end }) => [{ start: start + COMMENT_OPEN, end: end - COMMENT_CLOSE }],
      }),
    ),
    Match.when({ nodeName: "#text", value: Match.string }, (textNode) =>
      Option.match(
        Option.filter(locationOf(textNode), () => Str.trim(textNode.value) !== ""),
        {
          onNone: () => NO_SPANS,
          onSome: (span) => {
            if (LINE_BY_LINE.has(parentTagOf(textNode))) {
              return linesIn(text, span);
            }
            return [span];
          },
        },
      ),
    ),
    Match.when({ attrs: Match.defined }, (element) => attributeSpans(text, element)),
    Match.orElse(() => NO_SPANS),
  );

const childrenOf = (node: Node): readonly Node[] =>
  Match.value(node).pipe(
    Match.when({ childNodes: Match.defined }, ({ childNodes }) => childNodes),
    Match.orElse(() => []),
  );

const spansIn = (text: string, node: Node): readonly Span[] => [
  ...ownSpans(text, node),
  ...pipe(
    childrenOf(node),
    Arr.flatMap((child) => spansIn(text, child)),
  ),
];

const byStart = Order.mapInput(Order.Number, ({ start }: Span) => start);

const htmlUnitsOf = (text: string): readonly Span[] => {
  const spans = pipe(
    spansIn(text, parse(text, { sourceCodeLocationInfo: true })),
    Arr.filter(({ start, end }) => pipe(text, Str.slice(start, end), Str.trim) !== ""),
  );
  return Arr.sort(spans, byStart);
};

const htmlParser: Parser = {
  format: "html",
  extensions: [".html", ".htm", ".xhtml", ".vue", ".svelte", ".astro"],
  accepts: looksLikeHtml,
  unitsOf: (text) =>
    pipe(
      htmlUnitsOf(text),
      Arr.map(({ start, end }) => ({ kind: "prose", start, end })),
    ),
};

export { htmlParser };

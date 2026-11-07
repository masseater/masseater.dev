import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import type { Code, Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { gfm } from "micromark-extension-gfm";

import type { Parser, Span, Unit } from "./parser.ts";

const SIGNS = /^(?:#{1,6}\s|```|~~~)|!?\[[^\]\n]*\]\(/mu;

const MARKUP_START = /^\s*</u;

const FENCE = /^\s*(?:```|~~~)/u;

const NEWLINE = "\n";

const FRONTMATTER = "yaml";

const NO_UNITS: readonly Unit[] = [];

const looksLikeMarkdown = (text: string): boolean => SIGNS.test(text) && !MARKUP_START.test(text);

const spanOf = (node: Nodes): Option.Option<Span> =>
  Option.fromNullishOr(node.position).pipe(
    Option.flatMap(({ start, end }) =>
      Option.all({
        start: Option.fromNullishOr(start.offset),
        end: Option.fromNullishOr(end.offset),
      }),
    ),
  );

const bodyOf = (text: string, { start, end }: Span): Span => {
  const opening = pipe(
    Str.slice(start)(text),
    Str.indexOf(NEWLINE),
    Option.map((at) => at + start + NEWLINE.length),
    Option.filter((at) => at <= end),
  );
  if (Option.isNone(opening)) {
    return { start: end, end };
  }
  const closing = pipe(
    Str.takeLeft(end)(text),
    Str.lastIndexOf(NEWLINE),
    Option.filter((at) => at >= opening.value),
  );
  return { start: opening.value, end: Option.getOrElse(closing, () => end) };
};

const fencedBodyOf = (text: string, span: Span): Span => {
  if (FENCE.test(Str.slice(span.start, span.end)(text))) {
    return bodyOf(text, span);
  }
  return span;
};

const codeUnits = (text: string, code: Code, span: Span): readonly Unit[] => [
  { kind: "nested", format: code.lang ?? "", ...fencedBodyOf(text, span) },
];

const childrenOf = (node: Nodes): readonly Nodes[] =>
  Match.value(node).pipe(
    Match.when({ children: Match.defined }, ({ children }) => children),
    Match.orElse(() => []),
  );

const imagesIn = (node: Nodes): readonly Span[] => {
  if (node.type === "image" || node.type === "imageReference") {
    return Option.toArray(spanOf(node));
  }
  return pipe(
    childrenOf(node),
    Arr.flatMap((child) => imagesIn(child)),
  );
};

const blockUnits = (block: Nodes, span: Span): readonly Unit[] => {
  const images = imagesIn(block);
  const starts = [
    span.start,
    ...pipe(
      images,
      Arr.map(({ end }) => end),
    ),
  ];
  const ends = [
    ...pipe(
      images,
      Arr.map(({ start }) => start),
    ),
    span.end,
  ];
  return [
    ...Arr.zipWith(starts, ends, (start, end): Unit => ({ kind: "prose", start, end })),
    ...pipe(
      images,
      Arr.map(({ start, end }): Unit => ({ kind: "whole", start, end })),
    ),
  ];
};

const unitsIn = (text: string, node: Nodes): readonly Unit[] =>
  Option.match(spanOf(node), {
    onNone: () =>
      pipe(
        childrenOf(node),
        Arr.flatMap((child) => unitsIn(text, child)),
      ),
    onSome: (span) =>
      Match.value(node).pipe(
        Match.when({ type: "code" }, (code) => codeUnits(text, code, span)),
        Match.when({ type: "html" }, (): readonly Unit[] => [
          { kind: "nested", format: "html", ...span },
        ]),
        Match.when({ type: "yaml" }, (): readonly Unit[] => [
          { kind: "nested", format: "yaml", ...bodyOf(text, span) },
        ]),
        Match.whenOr({ type: "paragraph" }, { type: "heading" }, (block) =>
          blockUnits(block, span),
        ),
        Match.whenOr({ type: "tableCell" }, { type: "definition" }, (): readonly Unit[] => [
          { kind: "prose", ...span },
        ]),
        Match.orElse(() => {
          const children = childrenOf(node);
          if (Arr.isReadonlyArrayEmpty(children)) {
            return NO_UNITS;
          }
          return pipe(
            children,
            Arr.flatMap((child) => unitsIn(text, child)),
          );
        }),
      ),
  });

const markdownUnitsOf = (text: string): readonly Unit[] =>
  unitsIn(
    text,
    fromMarkdown(text, {
      extensions: [gfm(), frontmatter(FRONTMATTER)],
      mdastExtensions: [...gfmFromMarkdown(), frontmatterFromMarkdown(FRONTMATTER)],
    }),
  );

const markdownParser: Parser = {
  format: "markdown",
  extensions: [".md", ".markdown", ".mdx", ".mdown", ".mkd"],
  accepts: looksLikeMarkdown,
  unitsOf: markdownUnitsOf,
};

export { markdownParser };

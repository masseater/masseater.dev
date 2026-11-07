import { Array as Arr, Match, Option, String as Str, Record as Rec, pipe, Order } from "effect";
import { Parser as YamlParser, isCollection, parseDocument } from "yaml";

import type { Parser, Span, Unit } from "./parser.ts";
import { looksLikeProse } from "./prose.ts";

const ENTRIES = 2;

const STRUCTURE = /^(?:\s|- |#|---$|\.\.\.$|[^\s:#][^:\n]*:(?:\s|$))/u;

const looksLikeYaml = (text: string): boolean => {
  const document = parseDocument(text);
  const { contents } = document;
  return (
    Arr.isReadonlyArrayEmpty(document.errors) &&
    isCollection(contents) &&
    contents.items.length >= ENTRIES &&
    pipe(
      text,
      Str.split("\n"),
      Arr.filter((line) => Str.trim(line) !== ""),
      Arr.every((line) => STRUCTURE.test(line)),
    )
  );
};

const COMMENT = "#".length;

const QUOTE = '"'.length;

interface SourceToken {
  readonly type: string;
  readonly offset: number;
  readonly source: string;
}

const isSourceToken = (value: unknown): value is SourceToken =>
  Match.value(value).pipe(
    Match.when({ type: Match.string, offset: Match.number, source: Match.string }, () => true),
    Match.orElse(() => false),
  );

const spanIn = (text: string, token: SourceToken): Option.Option<Span> => {
  const end = token.offset + token.source.length;
  return Match.value(token.type).pipe(
    Match.when("comment", () => Option.some({ start: token.offset + COMMENT, end })),
    Match.when("scalar", () => Option.some({ start: token.offset, end })),
    Match.whenOr("single-quoted-scalar", "double-quoted-scalar", () =>
      Option.some({ start: token.offset + QUOTE, end: end - QUOTE }),
    ),
    Match.when("block-scalar", () =>
      pipe(
        Str.slice(token.offset)(text),
        Str.indexOf(token.source),
        Option.map((at) => {
          const start = at + token.offset;
          return { start, end: start + token.source.length };
        }),
      ),
    ),
    Match.orElse(() => Option.none()),
  );
};

const childrenOf = (value: unknown): readonly unknown[] =>
  Match.value(value).pipe(
    Match.when(Arr.isArray, (items: readonly unknown[]) => items),
    Match.when(Match.record, (record) =>
      pipe(
        Rec.toEntries(record),
        Arr.filter(([key]) => key !== "source"),
        Arr.map(([, child]) => child),
      ),
    ),
    Match.orElse(() => []),
  );

const ownSpan = (text: string, value: unknown): readonly Span[] => {
  if (isSourceToken(value)) {
    return Option.toArray(spanIn(text, value));
  }
  return [];
};

const spansIn = (text: string, value: unknown): readonly Span[] => [
  ...ownSpan(text, value),
  ...pipe(
    childrenOf(value),
    Arr.flatMap((child) => spansIn(text, child)),
  ),
];

const byStart = Order.mapInput(Order.Number, (span: Span) => span.start);

const yamlUnitsOf = (text: string): readonly Unit[] => {
  const spans = pipe(
    [...new YamlParser().parse(text)],
    Arr.flatMap((token) => spansIn(text, token)),
    Arr.filter(({ start, end }) => looksLikeProse(Str.slice(start, end)(text))),
  );
  return pipe(
    Arr.sort(spans, byStart),
    Arr.map(({ start, end }): Unit => ({ kind: "prose", start, end })),
  );
};

const yamlParser: Parser = {
  format: "yaml",
  extensions: [".yaml", ".yml"],
  accepts: looksLikeYaml,
  unitsOf: yamlUnitsOf,
};

export { yamlParser };

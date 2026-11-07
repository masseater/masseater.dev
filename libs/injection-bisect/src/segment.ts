import { Array as Arr, Match, Option, Order, String as Str, pipe } from "effect";

import type { Parser, Span } from "./parser.ts";
import { DEFAULT_PARSERS } from "./parsers.ts";

const FIRST = 0;

const AUTO = "auto";

const SENTENCE =
  /(?:[^\n。．！？.!?]|[.!?](?!\s|$)|(?<![>\n])\n(?![^\S\n]*(?:\n|[-*#<>|]|\d+[.)]|$)))+[。．！？.!?]*[^\S\n]*\n*/gu;

const spanOf = (sentence: string, index: number): readonly Span[] => {
  if (Str.trim(sentence) === "") {
    return [];
  }
  return [{ start: index, end: index + sentence.length }];
};

const proseSentencesOf = (text: string): readonly Span[] =>
  pipe(
    [...Str.matchAll(SENTENCE)(text)],
    Arr.flatMap((match) => spanOf(match[FIRST], match.index ?? FIRST)),
  );

const plainParser: Parser = {
  format: "plain",
  extensions: [".txt", ".text", ".log", ".tex", ".rst", ".adoc", ".org", ".textile"],
  accepts: () => true,
  unitsOf: (text) => [{ kind: "prose", start: FIRST, end: text.length }],
};

const isNamed =
  (name: string) =>
  ({ format, aliases = [] }: Parser): boolean => {
    const lowered = Str.toLowerCase(name);
    return format === lowered || aliases.includes(lowered);
  };

const byStart = Order.mapInput(Order.Number, ({ start }: Span) => start);

const segmenterOf = (
  parsers: readonly Parser[],
): ((document: Readonly<{ text: string; format?: string }>) => readonly Span[]) => {
  const detected = (text: string): Parser =>
    Option.getOrElse(
      Arr.findFirst(parsers, (parser) => parser.accepts(text)),
      () => plainParser,
    );
  const named = (format: string, text: string): Parser =>
    Option.getOrElse(Arr.findFirst([...parsers, plainParser], isNamed(format)), () =>
      detected(text),
    );
  const segmentsOf = (parser: Parser, text: string): readonly Span[] =>
    pipe(
      parser.unitsOf(text),
      Arr.flatMap((unit) => {
        const inner = Str.slice(unit.start, unit.end)(text);
        const spans = Match.value(unit).pipe(
          Match.when({ kind: "prose" }, () => proseSentencesOf(inner)),
          Match.when({ kind: "whole" }, () => spanOf(inner, FIRST)),
          Match.when({ kind: "nested" }, ({ format }) => segmentsOf(named(format, inner), inner)),
          Match.exhaustive,
        );
        return pipe(
          spans,
          Arr.map(({ start, end }) => ({ start: start + unit.start, end: end + unit.start })),
        );
      }),
    );
  const chosen = (format: string, text: string): Parser => {
    if (format === AUTO) {
      return detected(text);
    }
    return named(format, text);
  };
  return ({ text, format = AUTO }) => Arr.sort(segmentsOf(chosen(format, text), text), byStart);
};

const sentencesOf = segmenterOf(DEFAULT_PARSERS);

export { AUTO, isNamed, plainParser, segmenterOf, sentencesOf };

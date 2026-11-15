import { Array as Arr, String as Str, pipe } from "effect";

import type { Span, Unit } from "./parser.ts";

const PROSE = /\s|[^ -~]/u;

export const looksLikeProse = (text: string): boolean => PROSE.test(text);

export const proseUnitsIn =
  (text: string) =>
  (spans: readonly Span[]): readonly Unit[] =>
    pipe(
      spans,
      Arr.filter(({ start, end }) => looksLikeProse(Str.slice(start, end)(text))),
      Arr.map(({ start, end }): Unit => ({ kind: "prose", start, end })),
    );

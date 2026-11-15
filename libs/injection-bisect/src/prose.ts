import { Array as Arr, String as Str, pipe } from "effect";

import type { Span, Unit } from "./parser.ts";

export const PROSE = /\s|[^ -~]/u;

export const proseUnitsIn =
  (text: string) =>
  (spans: readonly Span[]): readonly Unit[] =>
    pipe(
      spans,
      Arr.filter(({ start, end }) => PROSE.test(Str.slice(start, end)(text))),
      Arr.map(({ start, end }): Unit => ({ kind: "prose", start, end })),
    );

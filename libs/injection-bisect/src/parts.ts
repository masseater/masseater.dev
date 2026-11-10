import { Array as Arr, Option } from "effect";

import type { Span } from "./parser.ts";

const ONE_SENTENCE = 1;

const FIRST = 0;

interface Part {
  readonly from: number;
  readonly to: number;
  readonly span: Span;
}

type Range = Pick<Part, "from" | "to">;

const spanOfRange = (sentences: readonly Span[], { from, to }: Range): Span => ({
  start: Option.match(Arr.get(sentences, from), {
    onNone: () => FIRST,
    onSome: ({ start }) => start,
  }),
  end: Option.match(Arr.get(sentences, to - ONE_SENTENCE), {
    onNone: () => FIRST,
    onSome: ({ end }) => end,
  }),
});

const partsOf =
  ({ sentences, branches }: Readonly<{ sentences: readonly Span[]; branches: number }>) =>
  ({ from, to }: Part): readonly Part[] => {
    const count = Math.min(branches, to - from);
    return Arr.makeBy(count, (index) => {
      const range = {
        from: from + Math.floor(((to - from) * index) / count),
        to: from + Math.floor(((to - from) * (index + ONE_SENTENCE)) / count),
      };
      return { ...range, span: spanOfRange(sentences, range) };
    });
  };

const unlocatedSpan =
  (sentences: readonly Span[]) =>
  (found: Part): Span => {
    if (found.to - found.from === ONE_SENTENCE) {
      return spanOfRange(sentences, found);
    }
    return found.span;
  };

export { partsOf, unlocatedSpan };
export type { Part };

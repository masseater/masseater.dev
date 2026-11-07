import { Option, Array as Arr, String as Str, pipe } from "effect";

import type { Span, Unit } from "./parser.ts";
import { looksLikeProse } from "./prose.ts";

const START = 0;

const NEXT = 1;

const FOLD = /(?:\r\n|\r|\n)[ \t]/gu;

const NOTHING = /(?!)/gu;

interface Located {
  readonly text: string;
  readonly folded?: boolean;
}

interface View {
  readonly text: string;
  readonly offsets: readonly number[];
}

const foldsIn = (folded: boolean): RegExp => {
  if (folded) {
    return FOLD;
  }
  return NOTHING;
};

const viewOf = ({ text, folded = false }: Located): View => {
  const folds = Str.matchAll(foldsIn(folded))(text);
  const removed = new Set(
    Array.from(folds, (match) => {
      const [found] = match;
      const index = match.index ?? START;
      return Array.from({ length: found.length }, (_unit, at) => index + at);
    }).flat(),
  );
  const offsets = pipe(
    Array.from({ length: text.length }, (_unit, at) => at),
    Arr.filter((at) => !removed.has(at)),
  );
  return {
    text: pipe(
      offsets,
      Arr.map((at) => text[at] ?? ""),
      Arr.join(""),
    ),
    offsets: [...offsets, text.length],
  };
};

const locatorOf = (view: View): ((value: string) => Option.Option<Span>) => {
  const cursors = new Map<string, number>();
  return (value) => {
    const cursor = cursors.get(value) ?? START;
    const found = pipe(
      Str.slice(cursor)(view.text),
      Str.indexOf(value),
      Option.map((at) => at + cursor),
    );
    if (value === "" || Option.isNone(found)) {
      return Option.none();
    }
    const start = found.value;
    const end = start + value.length;
    cursors.set(value, end);
    return Option.all([
      Option.fromNullishOr(view.offsets[start]),
      Option.fromNullishOr(view.offsets[end - NEXT]),
    ]).pipe(Option.map(([from, last]) => ({ start: from, end: last + NEXT })));
  };
};

const proseUnitsOf =
  (located: Located) =>
  (values: readonly string[]): readonly Unit[] => {
    const locate = locatorOf(viewOf(located));
    return pipe(
      values,
      Arr.flatMap((value) => Option.toArray(locate(value))),
      Arr.filter(({ start, end }) =>
        looksLikeProse(pipe(located.text, Str.slice(start, end), Str.trim)),
      ),
      Arr.map(({ start, end }) => ({ kind: "prose", start, end })),
    );
  };

export { proseUnitsOf };
export type { Located };

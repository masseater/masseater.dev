import { Array as Arr, Boolean as Bool, Option, String as Str, pipe } from "effect";

import type { Range } from "./inline-exports-source.ts";

export interface Source {
  readonly text: string;
  readonly comments: readonly Range[];
  readonly usedOutside: readonly string[];
}

const START = 0;
const END = 1;
const NEXT = 1;
const NEWLINE = "\n";

export const textOf =
  (source: Source) =>
  (range: Range): string =>
    pipe(source.text, Str.slice(range[START], range[END]));

const lineStartOf = (source: Source, offset: number): number =>
  pipe(
    source.text,
    Str.slice(START, offset),
    Str.lastIndexOf(NEWLINE),
    Option.match({ onNone: () => START, onSome: (index) => index + NEXT }),
  );

export const indentOf =
  (source: Source) =>
  (offset: number): string =>
    textOf(source)([lineStartOf(source, offset), offset]);

export const lineRangeOf =
  (source: Source) =>
  (range: Range): Range => {
    const indented = Str.isEmpty(Str.trim(indentOf(source)(range[START])));
    const endsLine = pipe(source.text, Str.charAt(range[END]), Option.contains(NEWLINE));
    return [
      Bool.match(indented, {
        onFalse: () => range[START],
        onTrue: () => lineStartOf(source, range[START]),
      }),
      Bool.match(endsLine, { onFalse: () => range[END], onTrue: () => range[END] + NEXT }),
    ];
  };

export const commentsBefore =
  (source: Source) =>
  (start: number): readonly Range[] =>
    pipe(
      source.comments,
      Arr.findLast((comment) => comment[END] <= start),
      Option.filter((comment) => Str.isEmpty(Str.trim(textOf(source)([comment[END], start])))),
      Option.match({
        onNone: (): readonly Range[] => [],
        onSome: (comment) => [...commentsBefore(source)(comment[START]), comment],
      }),
    );

export const leadingTextOf =
  (source: Source) =>
  (start: number): string =>
    pipe(commentsBefore(source)(start), Arr.map(textOf(source)), Arr.join(NEWLINE));

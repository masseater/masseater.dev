import { Array as Arr, pipe } from "effect";

import type { SnippetNote } from "#/shared/lib/index.ts";

export const WIDTH = 100;

export const HEIGHT = 40;

export const NOTE = 3;

const PADDING = 2;

const SHORTEST = 1;

export type Frame = Readonly<{ low: number; span: number; end: number }>;

export const frameOf = (notes: readonly SnippetNote[]): Frame => {
  const pitches = pipe(
    notes,
    Arr.map((note) => note.midi),
  );
  const low = Math.min(...pitches) - PADDING;
  const high = Math.max(...pitches) + PADDING;
  const ends = pipe(
    notes,
    Arr.map((note) => note.start + note.length),
  );
  return { low, span: high - low, end: Math.max(SHORTEST, ...ends) };
};

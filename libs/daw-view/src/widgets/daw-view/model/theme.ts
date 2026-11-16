import { String as Str, pipe } from "effect";

import type { Tint } from "#/entities/song/index.ts";

export interface Theme {
  readonly ink: string;
  readonly dim: string;
  readonly line: string;
  readonly card: string;
  readonly hot: string;
  readonly wave: string;
  readonly played: string;
  readonly wall: string;
  readonly lane: string;
  readonly grid: string;
  readonly keyWhite: string;
  readonly keyBlack: string;
  readonly font: string;
  readonly tint: Tint;
}

const PREFIX = "--daw-";

export const readTheme = (node: HTMLElement): Theme => {
  const style = getComputedStyle(node);
  const read = (name: string): string => pipe(style.getPropertyValue(`${PREFIX}${name}`), Str.trim);
  const ink = read("ink");
  return {
    ink,
    dim: read("dim"),
    line: read("line"),
    card: read("card"),
    hot: read("hot"),
    wave: read("wave"),
    played: read("played"),
    wall: read("wall"),
    lane: read("lane"),
    grid: read("grid"),
    keyWhite: read("key-white"),
    keyBlack: read("key-black"),
    font: read("font"),
    tint: {
      lightness: Number(read("track-lightness")),
      chroma: Number(read("track-chroma")),
      ink,
    },
  };
};

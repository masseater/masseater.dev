import { Option, String as Str, pipe } from "effect";

const SONG_START = -63_072_000;

export const FIRST = 0;

export type Search = Readonly<{ text: string; search: string; from: number }>;

export const indexIn = ({ text, search, from }: Search): number =>
  pipe(
    text,
    Str.slice(from),
    Str.indexOf(search),
    Option.map((found) => found + from),
    Option.getOrThrowWith(() => new Error(`The template has no ${search}`)),
  );

export type Timed = Readonly<{ beat: number; id: number }>;

export const timeOf = ({ beat, id }: Timed): number => {
  if (id === FIRST) {
    return SONG_START;
  }
  return beat;
};

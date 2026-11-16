import { Array as Arr, Option, Order, pipe } from "effect";

import type { Song } from "#/entities/song/song.ts";

import type { BarRange } from "./keys.ts";

const FIRST = 1;
const SECOND = 2;

const fingerprintOf =
  (song: Song) =>
  (bar: number): string => {
    const notes = pipe(
      song.notes,
      Arr.filter((note) => note.bar === bar),
      Arr.map(
        (note) =>
          `${note.track}:${String(note.offset)}:${String(note.midi)}:${String(note.length)}`,
      ),
    );
    const hits = pipe(
      song.hits,
      Arr.filter((hit) => hit.bar === bar),
      Arr.map((hit) => `${hit.track}:${String(hit.offset)}:${hit.voice}`),
    );
    const slices = pipe(
      song.slices,
      Arr.filter((slice) => slice.bar === bar),
      Arr.map(
        (slice) => `${slice.track}:${String(slice.offset)}:${slice.sample}:${String(slice.index)}`,
      ),
    );
    return pipe(Arr.sort([...notes, ...hits, ...slices], Order.String), Arr.join("|"));
  };

const repeatOf =
  (prints: readonly string[]) =>
  (bar: number): boolean => {
    const print = prints[bar - FIRST] ?? "";
    return print !== "" && print === prints[bar - SECOND];
  };

const joinRun = (runs: readonly BarRange[], bar: number): readonly BarRange[] =>
  Option.match(Arr.last(runs), {
    onNone: () => [{ fromBar: bar - FIRST, toBar: bar }],
    onSome: (last) => {
      if (last.toBar !== bar - FIRST) {
        return [...runs, { fromBar: bar - FIRST, toBar: bar }];
      }
      return [...Arr.dropRight(runs, FIRST), { ...last, toBar: bar }];
    },
  });

export const repeatsOf = (song: Song): readonly BarRange[] => {
  const bars = song.bars.length;
  const prints = pipe(Arr.range(FIRST, bars), Arr.map(fingerprintOf(song)));
  const repeated = pipe(Arr.range(SECOND, bars), Arr.filter(repeatOf(prints)));
  return Arr.reduce(repeated, [] as readonly BarRange[], joinRun);
};

import { Array as Arr, Option, Order, pipe } from "effect";

import type { Events } from "#/entities/song/index.ts";

import type { BarRange } from "./keys.ts";

const FIRST = 1;
const SECOND = 2;

const fingerprintOf =
  (events: Events) =>
  (bar: number): string => {
    const start = events.timeline.barStart(bar);
    const end = events.timeline.barStart(bar + FIRST);
    const inBar = (at: number): boolean => at >= start && at < end;
    const notes = pipe(
      events.notes,
      Arr.filter((note) => inBar(note.start)),
      Arr.map(
        (note) =>
          `${String(note.part)}:${String(note.start - start)}:${String(note.midi)}:${String(note.end - note.start)}`,
      ),
    );
    const hits = pipe(
      events.hits,
      Arr.filter((hit) => inBar(hit.at)),
      Arr.map((hit) => `${String(hit.part)}:${String(hit.at - start)}:${hit.hit.voice}`),
    );
    return pipe(Arr.sort([...notes, ...hits], Order.String), Arr.join("|"));
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

export const repeatsOf =
  (events: Events) =>
  (bars: number): readonly BarRange[] => {
    const prints = pipe(Arr.range(FIRST, bars), Arr.map(fingerprintOf(events)));
    const repeated = pipe(Arr.range(SECOND, bars), Arr.filter(repeatOf(prints)));
    return Arr.reduce(repeated, [] as readonly BarRange[], joinRun);
  };

import { TICKS_PER_WHOLE, readSong } from "@r_masseater/fumx-parser";
import type { Song as ParsedSong } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Effect, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import type { Snippet } from "#/shared/lib/index.ts";

const QUARTERS_PER_WHOLE = 4;
const QUARTER = TICKS_PER_WHOLE / QUARTERS_PER_WHOLE;
const BEFORE = 1;
const DEFAULT_BPM = 120;
const FIRST_TICK = 0;

export type Section = Readonly<{ name: string; at: number }>;

export type Span = readonly [number, number];

export type Lane = Readonly<{ track: string; spans: readonly Span[] }>;

export type SongView = Readonly<{
  bars: number;
  bpm: number;
  sections: readonly Section[];
  lanes: readonly Lane[];
  snippet: (bar: number) => Snippet;
}>;

const endOf = (song: ParsedSong): number =>
  pipe(
    Arr.last(song.bars),
    Option.match({ onNone: () => TICKS_PER_WHOLE, onSome: (bar) => bar.start + bar.length }),
  );

const sectionsOf = (song: ParsedSong, end: number): readonly Section[] =>
  pipe(
    song.bars,
    Arr.flatMap((bar) =>
      pipe(
        bar.section,
        Option.map((name) => ({ name, at: bar.start / end })),
        Option.toArray,
      ),
    ),
  );

const joinedTo = (done: readonly Span[], [from, to]: Span): readonly Span[] =>
  pipe(
    Arr.last(done),
    Option.filter(([, lastTo]) => from <= lastTo),
    Option.match({
      onNone: (): readonly Span[] => Arr.append(done, [from, to]),
      onSome: ([lastFrom, lastTo]): readonly Span[] =>
        Arr.append(Arr.dropRight(done, BEFORE), [lastFrom, Num.max(lastTo, to)]),
    }),
  );

const merged = (spans: readonly Span[]): readonly Span[] => {
  let done: readonly Span[] = Arr.empty();
  for (const span of Arr.sortWith(spans, ([from]) => from, Order.Number)) {
    done = joinedTo(done, span);
  }
  return done;
};

const lanesOf = (soundings: readonly Sounding[], end: number): readonly Lane[] =>
  pipe(
    soundings,
    Arr.groupBy((sounding) => sounding.track),
    Rec.toEntries,
    Arr.map(([track, notes]) => ({
      track,
      spans: merged(
        pipe(
          notes,
          Arr.map((note): Span => [note.start / end, note.end / end]),
        ),
      ),
    })),
  );

const bpmAt =
  (song: ParsedSong) =>
  (bar: number): number =>
    pipe(
      song.bars,
      Arr.findFirst((each) => each.index === bar),
      Option.match({ onNone: () => DEFAULT_BPM, onSome: (each) => each.tempo.bpm }),
    );

const snippetOf =
  (song: ParsedSong, soundings: readonly Sounding[]) =>
  (bar: number): Snippet => {
    const inRange = pipe(
      soundings,
      Arr.filter((sounding) => sounding.bar >= bar - BEFORE && sounding.bar <= bar),
    );
    const from = pipe(
      inRange,
      Arr.map((sounding) => sounding.start),
      Arr.match({
        onEmpty: () => FIRST_TICK,
        onNonEmpty: (starts) => Math.min(...starts),
      }),
    );
    return {
      bpm: bpmAt(song)(bar),
      notes: pipe(
        inRange,
        Arr.map((sounding) => ({
          start: (sounding.start - from) / QUARTER,
          length: (sounding.end - sounding.start) / QUARTER,
          midi: sounding.midi,
        })),
      ),
    };
  };

type Read = Effect.Success<ReturnType<typeof readSong>>;

const songIn = (source: Read): Option.Option<ParsedSong> => {
  if (source.status === "valid") {
    return Option.some(source.song);
  }
  return Option.none();
};

export type SongText = Readonly<{ name: string; fumx: string }>;

export const parsedSongOf = ({ name, fumx }: SongText): Effect.Effect<Option.Option<ParsedSong>> =>
  readSong({ path: `/${name}.fumx`, read: () => Effect.succeed(fumx) }).pipe(
    Effect.map(songIn),
    Effect.orElseSucceed(() => Option.none<ParsedSong>()),
  );

export const viewOf = (song: ParsedSong): SongView => {
  const soundings = soundingsOf(song);
  const end = endOf(song);
  return {
    bars: song.bars.length,
    bpm: pipe(
      Arr.head(song.bars),
      Option.match({ onNone: () => DEFAULT_BPM, onSome: (bar) => bar.tempo.bpm }),
    ),
    sections: sectionsOf(song, end),
    lanes: lanesOf(soundings, end),
    snippet: snippetOf(song, soundings),
  };
};

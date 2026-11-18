import type { Structure, TrackStyle } from "@masseater.dev/daw-view";
import type { Song } from "@r_masseater/fumx-parser";
import { analyze } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Option, pipe } from "effect";
import { Chord, Note } from "tonal";

import { clockOf } from "#/features/render-song/model/clock.ts";

const STRAIGHT = 0.5;
const FIRST_BAR = 1;
const FULL_TURN = 360;
const HUE_START = 28;
const NONE = 0;
const ONE = 1;
const DEFAULT_BPM = 120;

interface Start {
  readonly name: string;
  readonly from: number;
}

const endedAt =
  (total: number) =>
  (starts: readonly Start[]): Structure["sections"] => {
    const ends = [
      ...pipe(
        Arr.drop(starts, ONE),
        Arr.map((next) => next.from),
      ),
      total,
    ];
    return pipe(
      Arr.zip(starts, ends),
      Arr.map(([start, to]) => ({ name: start.name, from: start.from, to })),
    );
  };

const sectionsOf = (song: Song): Structure["sections"] =>
  pipe(
    song.bars,
    Arr.flatMap((bar) =>
      pipe(
        bar.section,
        Option.map((name) => ({ name, from: bar.index })),
        Option.toArray,
      ),
    ),
    endedAt(song.bars.length),
  );

const marksOf = (song: Song): Structure["marks"] =>
  pipe(
    song.bars,
    Arr.flatMap((bar) =>
      pipe(
        bar.mark,
        Option.map((label) => ({ bar: bar.index, label })),
        Option.toArray,
      ),
    ),
  );

const stylesOf = (song: Song): readonly TrackStyle[] => {
  const names = [
    ...pipe(
      song.tracks,
      Arr.map((track) => ({ name: track.name, tone: "full" as const })),
    ),
    ...pipe(
      song.buses,
      Arr.map((bus) => ({ name: bus.name, tone: "faint" as const })),
    ),
  ];
  const spread = FULL_TURN / Math.max(ONE, names.length);
  return pipe(
    names,
    Arr.map(({ name, tone }, index) => ({
      name,
      tone,
      hue: (HUE_START + index * spread) % FULL_TURN,
    })),
  );
};

const lastTick = (song: Song): number =>
  pipe(
    Arr.last(song.bars),
    Option.match({ onNone: () => NONE, onSome: (bar) => bar.start + bar.length }),
  );

export const structureOf = (song: Song): Structure => {
  const clock = clockOf(song);
  const tempo = pipe(
    Arr.head(song.bars),
    Option.map((bar) => bar.tempo.bpm),
    Option.getOrElse(() => DEFAULT_BPM),
  );
  return {
    tempo,
    swing: Option.match(song.groove, {
      onNone: () => STRAIGHT,
      onSome: (groove) => groove.amount,
    }),
    bars: song.bars.length,
    tail: Math.max(NONE, clock.end - clock.secondsAt(lastTick(song))),
    sections: sectionsOf(song),
    marks: marksOf(song),
    tracks: stylesOf(song),
  };
};

export const rootsOf = (song: Song): readonly number[] => {
  const { chords } = analyze(song);
  return Arr.makeBy(song.bars.length, (index) =>
    pipe(
      chords,
      Arr.findFirst((chord) => chord.from.bar === index + FIRST_BAR),
      Option.flatMap((chord) => Option.fromNullishOr(Chord.get(chord.symbol).tonic)),
      Option.map(Note.chroma),
      Option.getOrElse(() => Number.NaN),
    ),
  );
};

export const keyOf = (song: Song): Option.Option<string> =>
  pipe(
    analyze(song).key,
    Option.map((key) => `${key.tonic} ${key.mode}`),
  );

import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Song } from "#/entities/song/index.ts";
import type { From } from "#/shared/lib/from.ts";

import type { LaidBar } from "./layout.ts";
import { controllerKeyOf } from "./plan.ts";
import type { Plan } from "./plan.ts";

const NONE = 0;
const NEXT = 1;
const UNKNOWN = -1;
const FULL = 127;
const DEFAULT_RELEASE = 64;
const MICROSECONDS_PER_MINUTE = 60_000_000;
const DECIMALS = 9;
const SHOWN = 20;

export interface Tally {
  readonly expected: number;
  readonly actual: number;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
}

export interface Comparison {
  readonly notes: Tally;
  readonly controls: Tally;
  readonly tempo: Tally;
  readonly lyrics: Tally;
  readonly marks: Tally;
  readonly matches: boolean;
}

const countsOf: From<readonly string[], Readonly<Record<string, number>>> = (keys) =>
  pipe(
    keys,
    Arr.groupBy((key) => key),
    Rec.map((same) => same.length),
  );

const surplusOf =
  (
    over: Readonly<Record<string, number>>,
  ): From<Readonly<Record<string, number>>, readonly string[]> =>
  (under) =>
    pipe(
      Rec.toEntries(over),
      Arr.flatMap(([key, count]) => {
        const left = count - Option.getOrElse(Rec.get(under, key), () => NONE);
        if (left > NONE) {
          return Arr.makeBy(left, () => key);
        }
        return [];
      }),
      Arr.take(SHOWN),
    );

const tallyOf = (expected: readonly string[], actual: readonly string[]): Tally => {
  const wanted = countsOf(expected);
  const found = countsOf(actual);
  return {
    expected: expected.length,
    actual: actual.length,
    missing: surplusOf(wanted)(found),
    extra: surplusOf(found)(wanted),
  };
};

const byteOf: From<number, number> = (share) => Math.round(share * FULL);

const releaseOf: From<Option.Option<number>, number> = (release) =>
  Option.match(release, { onNone: () => DEFAULT_RELEASE, onSome: byteOf });

const keyOf: From<readonly (string | number)[], string> = (parts) =>
  pipe(parts, Arr.map(String), Arr.join(" "));

const expectedNotesOf: From<Plan, readonly string[]> = (plan) =>
  pipe(
    plan.parts,
    Arr.flatMap((planned) =>
      pipe(
        planned.part.notes,
        Arr.map((note) =>
          keyOf([
            planned.name,
            note.tick,
            note.end - note.tick,
            note.midi,
            note.velocity,
            note.release,
          ]),
        ),
      ),
    ),
  );

const actualNotesOf: From<Omit<CompareInput, "bars">, readonly string[]> = ({ plan, song }) => {
  const voices = new Map(
    pipe(
      Arr.fromIterable(plan.drumVoices),
      Arr.map(([midi, name]) => [name, midi] as const),
    ),
  );
  const notes = pipe(
    song.notes,
    Arr.map((note) =>
      keyOf([
        note.track,
        note.start,
        note.length,
        note.midi,
        byteOf(note.velocity),
        releaseOf(note.releaseVelocity),
      ]),
    ),
  );
  const hits = pipe(
    song.hits,
    Arr.map((hit) =>
      keyOf([
        hit.track,
        hit.start,
        hit.length,
        voices.get(hit.voice) ?? UNKNOWN,
        byteOf(hit.velocity),
        releaseOf(hit.releaseVelocity),
      ]),
    ),
  );
  return [...notes, ...hits];
};

const rounded: From<number, string> = (value) => String(Number(value.toFixed(DECIMALS)));

const expectedControlsOf: From<Plan, readonly string[]> = (plan) =>
  pipe(
    plan.parts,
    Arr.flatMap((planned) =>
      pipe(
        planned.controls,
        Arr.map((control) =>
          keyOf([planned.name, controllerKeyOf(control), control.tick, rounded(control.value)]),
        ),
      ),
    ),
  );

const actualControlsOf: From<Song, readonly string[]> = (song) =>
  pipe(
    song.controls,
    Arr.map((control) =>
      keyOf([
        control.track,
        controllerKeyOf({ controller: control.controller }),
        control.start,
        rounded(control.value),
      ]),
    ),
  );

type TempoPoint = readonly [number, number];

const changesOf: From<readonly TempoPoint[], readonly string[]> = (points) =>
  pipe(
    points,
    Arr.filter(([, microseconds], index) =>
      pipe(
        Arr.get(points, index - NEXT),
        Option.match({
          onNone: () => true,
          onSome: ([, previous]) => previous !== microseconds,
        }),
      ),
    ),
    Arr.map((point) => keyOf(point)),
  );

const expectedTempoOf: From<readonly LaidBar[], readonly string[]> = (bars) =>
  changesOf(
    pipe(
      bars,
      Arr.flatMap((bar) =>
        pipe(
          bar.tempo,
          Arr.map((step): TempoPoint => [bar.start + step.offset, step.microseconds]),
        ),
      ),
    ),
  );

const microsecondsOf: From<number, number> = (bpm) => Math.round(MICROSECONDS_PER_MINUTE / bpm);

const barPointsOf: From<Song["bars"][number], readonly TempoPoint[]> = (bar) => {
  if (Arr.isReadonlyArrayNonEmpty(bar.tempoSteps)) {
    return pipe(
      bar.tempoSteps,
      Arr.map((step): TempoPoint => [bar.start + step.offset, microsecondsOf(step.bpm)]),
    );
  }
  return [[bar.start, microsecondsOf(bar.tempo.bpm)]];
};

const actualTempoOf: From<Song, readonly string[]> = (song) =>
  changesOf(pipe(song.bars, Arr.flatMap(barPointsOf)));

const expectedLyricsOf: From<Plan, readonly string[]> = (plan) =>
  pipe(
    plan.parts,
    Arr.flatMap((planned) =>
      pipe(
        planned.lines,
        Arr.flatten,
        Arr.flatMap((group) =>
          pipe(
            group.lyric,
            Option.map((text) => keyOf([planned.name, group.start, text])),
            Option.toArray,
          ),
        ),
      ),
    ),
  );

const syllableKeyOf: From<Song["notes"][number], Option.Option<string>> = (note) =>
  pipe(
    note.lyric,
    Option.flatMap((lyric) => {
      if (lyric.kind === "syllable") {
        return Option.some(keyOf([note.track, note.start, lyric.text]));
      }
      return Option.none();
    }),
  );

const actualLyricsOf: From<Song, readonly string[]> = (song) =>
  pipe(song.notes, Arr.map(syllableKeyOf), Arr.getSomes, Arr.dedupe);

const expectedMarksOf: From<readonly LaidBar[], readonly string[]> = (bars) =>
  pipe(
    bars,
    Arr.filter((bar) => Arr.isReadonlyArrayNonEmpty(bar.marks)),
    Arr.map((bar) => keyOf([bar.start, Arr.join(bar.marks, " / ")])),
  );

const actualMarksOf: From<Song, readonly string[]> = (song) =>
  pipe(
    song.bars,
    Arr.map((bar) =>
      pipe(
        bar.mark,
        Option.map((mark) => keyOf([bar.start, mark])),
      ),
    ),
    Arr.getSomes,
  );

const isClean: From<Tally, boolean> = (tally) =>
  !Arr.isReadonlyArrayNonEmpty(tally.missing) && !Arr.isReadonlyArrayNonEmpty(tally.extra);

export interface CompareInput {
  readonly plan: Plan;
  readonly bars: readonly LaidBar[];
  readonly song: Song;
}

export const compareWithMidi: From<CompareInput, Comparison> = ({ plan, bars, song }) => {
  const tallies = {
    notes: tallyOf(expectedNotesOf(plan), actualNotesOf({ plan, song })),
    controls: tallyOf(expectedControlsOf(plan), actualControlsOf(song)),
    tempo: tallyOf(expectedTempoOf(bars), actualTempoOf(song)),
    lyrics: tallyOf(expectedLyricsOf(plan), actualLyricsOf(song)),
    marks: tallyOf(expectedMarksOf(bars), actualMarksOf(song)),
  };
  return { ...tallies, matches: pipe(Rec.values(tallies), Arr.every(isClean)) };
};

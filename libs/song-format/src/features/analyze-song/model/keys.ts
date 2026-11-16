import { Array as Arr, Option, Order, Record, Schema, pipe } from "effect";

import { overlapOf } from "#/entities/song/index.ts";
import type { Events, Sounding, Span } from "#/entities/song/index.ts";

const FIRST = 1;
const NONE = 0;
const OCTAVE = 12;
const SQUARE = 2;
const ROUND = 1000;
const UNKNOWN = "?";

const MAJOR_PROFILE = {
  tonic: 6.35,
  minorSecond: 2.23,
  majorSecond: 3.48,
  minorThird: 2.33,
  majorThird: 4.38,
  fourth: 4.09,
  tritone: 2.52,
  fifth: 5.19,
  minorSixth: 2.39,
  majorSixth: 3.66,
  minorSeventh: 2.29,
  majorSeventh: 2.88,
};

const MINOR_PROFILE = {
  tonic: 6.33,
  minorSecond: 2.68,
  majorSecond: 3.52,
  minorThird: 5.38,
  majorThird: 2.6,
  fourth: 3.53,
  tritone: 2.54,
  fifth: 4.75,
  minorSixth: 3.98,
  majorSixth: 2.69,
  minorSeventh: 3.34,
  majorSeventh: 3.17,
};

const MAJOR_TONICS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_TONICS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

const ModeSchema = Schema.Literals(["major", "minor"]);

type Mode = typeof ModeSchema.Type;

const barRangeFields = { fromBar: Schema.Int, toBar: Schema.Int };

export const BarRangeSchema = Schema.Struct(barRangeFields);

export type BarRange = typeof BarRangeSchema.Type;

export const KeySpanSchema = Schema.Struct({
  ...barRangeFields,
  tonic: Schema.String,
  mode: ModeSchema,
  correlation: Schema.Finite,
});

export type KeySpan = typeof KeySpanSchema.Type;

interface Candidate {
  readonly tonic: string;
  readonly mode: Mode;
  readonly correlation: number;
}

const pitchClassOf = (midi: number): number => ((midi % OCTAVE) + OCTAVE) % OCTAVE;

const addWeight =
  (window: Span) =>
  (weights: readonly number[], note: Sounding): readonly number[] => {
    const share = overlapOf(note)(window);
    const pitchClass = pitchClassOf(note.midi);
    return pipe(
      weights,
      Arr.map((weight, index) => {
        if (index === pitchClass) {
          return weight + share;
        }
        return weight;
      }),
    );
  };

const histogramOf =
  (window: Span) =>
  (notes: readonly Sounding[]): readonly number[] =>
    Arr.reduce(
      notes,
      Arr.makeBy(OCTAVE, () => NONE),
      addWeight(window),
    );

const add = (sum: number, value: number): number => sum + value;

const sumOf = (values: readonly number[]): number => Arr.reduce(values, NONE, add);

const meanOf = (values: readonly number[]): number => sumOf(values) / values.length;

const spreadOf = (values: readonly number[]): number => {
  const center = meanOf(values);
  const squares = pipe(
    values,
    Arr.map((value) => (value - center) ** SQUARE),
  );
  return Math.sqrt(sumOf(squares));
};

const correlationOf =
  (profile: readonly number[]) =>
  (histogram: readonly number[]): number => {
    const histogramMean = meanOf(histogram);
    const profileMean = meanOf(profile);
    const covariance = sumOf(
      pipe(
        Arr.zip(histogram, profile),
        Arr.map(([weight, expected]) => (weight - histogramMean) * (expected - profileMean)),
      ),
    );
    const scale = spreadOf(histogram) * spreadOf(profile);
    if (scale === NONE) {
      return NONE;
    }
    return covariance / scale;
  };

const rotated =
  (tonic: number) =>
  (profile: Readonly<Record<string, number>>): readonly number[] => {
    const weights = Record.values(profile);
    return Arr.makeBy(OCTAVE, (index) => weights[(index - tonic + OCTAVE) % OCTAVE] ?? NONE);
  };

const candidatesAt =
  (histogram: readonly number[]) =>
  (tonic: number): readonly Candidate[] => [
    {
      tonic: MAJOR_TONICS[tonic] ?? UNKNOWN,
      mode: "major",
      correlation: correlationOf(rotated(tonic)(MAJOR_PROFILE))(histogram),
    },
    {
      tonic: MINOR_TONICS[tonic] ?? UNKNOWN,
      mode: "minor",
      correlation: correlationOf(rotated(tonic)(MINOR_PROFILE))(histogram),
    },
  ];

const byCorrelation = Order.flip(
  Order.mapInput(Order.Number, (candidate: Candidate) => candidate.correlation),
);

export const keyIn =
  (events: Events) =>
  (range: BarRange): Option.Option<KeySpan> => {
    const histogram = histogramOf({
      start: events.timeline.barStart(range.fromBar),
      end: events.timeline.barStart(range.toBar + FIRST),
    })(events.notes);
    const silent = pipe(
      histogram,
      Arr.every((weight) => weight === NONE),
    );
    if (silent) {
      return Option.none();
    }
    const candidates = pipe(Arr.range(NONE, OCTAVE - FIRST), Arr.flatMap(candidatesAt(histogram)));
    return pipe(
      Arr.sort(candidates, byCorrelation),
      Arr.head,
      Option.map((best) => ({
        fromBar: range.fromBar,
        toBar: range.toBar,
        tonic: best.tonic,
        mode: best.mode,
        correlation: Math.round(best.correlation * ROUND) / ROUND,
      })),
    );
  };

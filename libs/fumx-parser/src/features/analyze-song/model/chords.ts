import { Array as Arr, Option, Order, Schema, pipe } from "effect";
import { Chord } from "tonal";

import type { Song } from "#/entities/song/index.ts";
import { TICKS_PER_WHOLE } from "#/shared/lib/ticks.ts";

import { overlapOf, positionOf, soundingsOf } from "./sounding.ts";
import type { Sounding, Span } from "./sounding.ts";

const FIRST = 1;
const HELD_SHARE = 0.25;
const UNKNOWN = "?";

const PositionSchema = Schema.Struct({ bar: Schema.Int, offset: Schema.String });

export const ChordSpanSchema = Schema.Struct({
  from: PositionSchema,
  to: PositionSchema,
  start: Schema.Int,
  end: Schema.Int,
  symbol: Schema.String,
  notes: Schema.Array(Schema.String),
});

export type ChordSpan = typeof ChordSpanSchema.Type;

interface BeatChord extends Span {
  readonly symbol: string;
  readonly notes: readonly string[];
}

const heldIn =
  (window: Span) =>
  (note: Sounding): boolean =>
    overlapOf(note)(window) >= (window.end - window.start) * HELD_SHARE;

const isHarmonic = (note: Sounding): boolean =>
  Option.exists(note.role, (role) => role === "bass" || role === "harmony");

const OCTAVE = 12;

const UNISON = 0;

const samePitchClass = (left: number, right: number): boolean => (left - right) % OCTAVE === UNISON;

const byMidi = Order.mapInput(Order.Number, (note: Sounding) => note.midi);

const harmonicOrAll = (held: readonly Sounding[]): readonly Sounding[] => {
  const harmonic = pipe(held, Arr.filter(isHarmonic));
  if (Arr.isReadonlyArrayNonEmpty(harmonic)) {
    return harmonic;
  }
  return held;
};

const chordNotesIn =
  (notes: readonly Sounding[]) =>
  (window: Span): readonly string[] =>
    pipe(
      notes,
      Arr.filter(heldIn(window)),
      harmonicOrAll,
      (held) => Arr.sort(held, byMidi),
      Arr.dedupeWith((left, right) => samePitchClass(left.midi, right.midi)),
      Arr.map((note) => note.pitchClass),
    );

const spells =
  (notes: readonly string[]) =>
  (symbol: string): boolean => {
    const spelled = Chord.get(symbol).notes;
    return (
      spelled.length === notes.length &&
      pipe(
        spelled,
        Arr.every((note) => Arr.contains(notes, note)),
      )
    );
  };

const symbolOf = (notes: readonly string[]): string => {
  const candidates = Chord.detect(Arr.copy(notes));
  return pipe(
    candidates,
    Arr.findFirst(spells(notes)),
    Option.orElse(() => Arr.head(candidates)),
    Option.getOrElse(() => UNKNOWN),
  );
};

const beatWindowsOf = (song: Song): readonly Span[] =>
  pipe(
    song.bars,
    Arr.flatMap((bar) => {
      const beat = TICKS_PER_WHOLE / bar.meter.denominator;
      return Arr.makeBy(bar.meter.numerator, (index) => ({
        start: bar.start + index * beat,
        end: bar.start + (index + FIRST) * beat,
      }));
    }),
  );

const extend = (spans: readonly BeatChord[], beat: BeatChord): readonly BeatChord[] =>
  Option.match(Arr.last(spans), {
    onNone: () => [beat],
    onSome: (last) => {
      if (last.symbol !== beat.symbol || last.end !== beat.start) {
        return [...spans, beat];
      }
      return [...Arr.dropRight(spans, FIRST), { ...last, end: beat.end }];
    },
  });

const beatChordOf =
  (notes: readonly Sounding[]) =>
  (window: Span): Option.Option<BeatChord> => {
    const held = chordNotesIn(notes)(window);
    if (!Arr.isReadonlyArrayNonEmpty(held)) {
      return Option.none();
    }
    return Option.some({ ...window, notes: held, symbol: symbolOf(held) });
  };

export const chordsOf = (song: Song): readonly ChordSpan[] => {
  const notes = soundingsOf(song);
  const beats = pipe(beatWindowsOf(song), Arr.map(beatChordOf(notes)), Arr.getSomes);
  const at = positionOf(song);
  return pipe(
    Arr.reduce(beats, [] as readonly BeatChord[], extend),
    Arr.map((span) => ({
      from: at(span.start),
      to: at(span.end),
      start: span.start,
      end: span.end,
      symbol: span.symbol,
      notes: span.notes,
    })),
  );
};

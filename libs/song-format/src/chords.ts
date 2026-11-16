import { Array as Arr, Option, Order, Schema, pipe } from "effect";
import { Chord } from "tonal";

import type { Events, Sounding } from "./events.ts";
import { PositionSchema, TICKS_PER_BEAT } from "./song.ts";
import { overlapOf } from "./time.ts";
import type { Span } from "./time.ts";

const FIRST = 1;
const HELD_SHARE = 0.25;
const UNKNOWN = "?";

export const ChordSpanSchema = Schema.Struct({
  from: PositionSchema,
  to: PositionSchema,
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

const isHarmonic = (note: Sounding): boolean => note.role === "bass" || note.role === "harmony";

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
  (window: Span): readonly string[] => {
    const held = pipe(notes, Arr.filter(heldIn(window)));
    const chosen = harmonicOrAll(held);
    return pipe(
      Arr.sort(chosen, byMidi),
      Arr.map((note) => note.pitchClass),
      Arr.dedupe,
    );
  };

const symbolOf = (notes: readonly string[]): string =>
  pipe(
    Chord.detect(Arr.copy(notes)),
    Arr.head,
    Option.getOrElse(() => UNKNOWN),
  );

const beatWindows = (events: Events): readonly Span[] =>
  Arr.makeBy(Math.ceil(events.end / TICKS_PER_BEAT), (beat) => ({
    start: beat * TICKS_PER_BEAT,
    end: (beat + FIRST) * TICKS_PER_BEAT,
  }));

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

export const chordsOf = (events: Events): readonly ChordSpan[] => {
  const beats = pipe(beatWindows(events), Arr.map(beatChordOf(events.notes)), Arr.getSomes);
  return pipe(
    Arr.reduce(beats, [] as readonly BeatChord[], extend),
    Arr.map((span) => ({
      from: events.timeline.positionOf(span.start),
      to: events.timeline.positionOf(span.end),
      symbol: span.symbol,
      notes: span.notes,
    })),
  );
};

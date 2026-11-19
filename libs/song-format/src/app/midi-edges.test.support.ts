import { Array as Arr, Order, pipe } from "effect";
import { writeMidi } from "midi-file";
import type { MidiEvent } from "midi-file";

const PPQ = 960;
const QUINTUPLET = 5;
const FIFTH = PPQ / QUINTUPLET;
const COUNT = { two: 2, three: 3, four: 4, six: 6 } as const;
const EIGHTH = PPQ / COUNT.two;
const BEAT = { first: 0, second: PPQ, third: PPQ * COUNT.two, seventh: PPQ * COUNT.six } as const;
const FIFTHS = {
  second: FIFTH * COUNT.two,
  third: FIFTH * COUNT.three,
  fourth: FIFTH * COUNT.four,
} as const;
const LENGTH = { beat: PPQ, twoBeats: PPQ * COUNT.two, fourBeats: PPQ * COUNT.four } as const;
const WALTZ_BAR = PPQ * COUNT.three;
const CHANNEL = 0;
const RELEASE = 64;
const TEMPO_120 = 500_000;
const CLICKS = 24;
const THIRTY_SECONDS = 8;
const NO_DELAY = 0;
const FORMAT = 1;
const PITCH = { lowest: 0, c4: 60, d4: 62, e4: 64, f4: 65, g4: 67, c5: 72, highest: 127 } as const;
const VELOCITY = { quietest: 1, soft: 70, medium: 90, warm: 80, loudest: 127 } as const;
const METER = {
  waltz: { numerator: 3, denominator: 4 },
  jig: { numerator: 6, denominator: 8 },
} as const;

type EventBody = MidiEvent extends infer Event
  ? Event extends MidiEvent
    ? Omit<Event, "deltaTime">
    : never
  : never;

interface At {
  readonly at: number;
  readonly event: EventBody;
}

interface NoteSpec {
  readonly at: number;
  readonly length: number;
  readonly pitch: number;
  readonly velocity: number;
}

const byAt = Order.mapInput(Order.Number, (item: At) => item.at);

const relative = (events: readonly At[]): readonly MidiEvent[] =>
  pipe(
    Arr.sort(events, byAt),
    Arr.mapAccum(NO_DELAY, (previous, item): readonly [number, MidiEvent] => [
      item.at,
      { deltaTime: item.at - previous, ...item.event },
    ]),
    ([, events_]) => events_,
  );

const noteOf = ({ at, length, pitch, velocity }: NoteSpec): readonly At[] => [
  { at, event: { type: "noteOn", channel: CHANNEL, noteNumber: pitch, velocity } },
  {
    at: at + length,
    event: { type: "noteOff", channel: CHANNEL, noteNumber: pitch, velocity: RELEASE },
  },
];

const meterAt = (
  at: number,
  meter: { readonly numerator: number; readonly denominator: number },
): At => ({
  at,
  event: {
    type: "timeSignature",
    meta: true,
    numerator: meter.numerator,
    denominator: meter.denominator,
    metronome: CLICKS,
    thirtyseconds: THIRTY_SECONDS,
  },
});

const conductor: readonly At[] = [
  { at: BEAT.first, event: { type: "trackName", meta: true, text: "Edges" } },
  meterAt(BEAT.first, METER.waltz),
  { at: BEAT.first, event: { type: "setTempo", meta: true, microsecondsPerBeat: TEMPO_120 } },
  meterAt(WALTZ_BAR, METER.jig),
];

const END: MidiEvent = { deltaTime: NO_DELAY, meta: true, type: "endOfTrack" };

const fileOf = (notes: readonly NoteSpec[]): Uint8Array => {
  const tracks = pipe(
    [conductor, pipe(notes, Arr.flatMap(noteOf))],
    Arr.map((track): MidiEvent[] => Arr.append(relative(track), END)),
  );
  return Uint8Array.from(
    writeMidi({ header: { format: FORMAT, numTracks: tracks.length, ticksPerBeat: PPQ }, tracks }),
  );
};

export const EXTREME_NOTES: readonly NoteSpec[] = [
  { at: BEAT.first, length: LENGTH.beat, pitch: PITCH.lowest, velocity: VELOCITY.quietest },
  { at: BEAT.first, length: LENGTH.beat, pitch: PITCH.highest, velocity: VELOCITY.loudest },
  { at: BEAT.second, length: FIFTH, pitch: PITCH.c4, velocity: VELOCITY.medium },
  { at: BEAT.second + FIFTH, length: FIFTH, pitch: PITCH.d4, velocity: VELOCITY.medium },
  { at: BEAT.second + FIFTHS.second, length: FIFTH, pitch: PITCH.e4, velocity: VELOCITY.medium },
  { at: BEAT.second + FIFTHS.third, length: FIFTH, pitch: PITCH.f4, velocity: VELOCITY.medium },
  { at: BEAT.second + FIFTHS.fourth, length: FIFTH, pitch: PITCH.g4, velocity: VELOCITY.medium },
  { at: BEAT.third, length: LENGTH.fourBeats, pitch: PITCH.c5, velocity: VELOCITY.warm },
  { at: BEAT.seventh, length: EIGHTH, pitch: PITCH.c4, velocity: VELOCITY.soft },
  { at: BEAT.seventh + EIGHTH, length: EIGHTH, pitch: PITCH.c4, velocity: VELOCITY.soft },
];

export const OVERLAPPING_NOTES: readonly NoteSpec[] = [
  { at: BEAT.first, length: LENGTH.twoBeats, pitch: PITCH.c4, velocity: VELOCITY.medium },
  { at: BEAT.second, length: LENGTH.twoBeats, pitch: PITCH.c4, velocity: VELOCITY.soft },
];

export const extremes = (): Uint8Array => fileOf(EXTREME_NOTES);

export const overlapping = (): Uint8Array => fileOf(OVERLAPPING_NOTES);

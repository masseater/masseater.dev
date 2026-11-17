import { Array as Arr, Option, Order, pipe } from "effect";
import { writeMidi } from "midi-file";
import type { MidiEvent } from "midi-file";

import type { From } from "#/shared/lib/from.ts";

const PPQ = 960;
const BEATS = { bar: 4, half: 2, dottedHalf: 3 } as const;
const PER_BEAT = { triplet: 3, eighths: 2, sixteenths: 4 } as const;
const BAR = PPQ * BEATS.bar;
const HALF = PPQ * BEATS.half;
const DOTTED_HALF = PPQ * BEATS.dottedHalf;
const THIRD = PPQ / PER_BEAT.triplet;
const EIGHTH = PPQ / PER_BEAT.eighths;
const SIXTEENTH = PPQ / PER_BEAT.sixteenths;
const TINY = 7;
const BEND_SLIDE = 13;
const PIANO_CHANNEL = 0;
const STRINGS_CHANNEL = 1;
const DRUM_CHANNEL = 9;
const NO_DELAY = 0;
const ORIGIN = 0;
const NEXT = 1;
const ONE_TICK = 1;
const ZERO_LENGTH = 0;
const RPN_BEND = 0;

const PROGRAM = { piano: 0, organ: 19, strings: 48 } as const;
const CC = { sustain: 64, rpnMsb: 101, rpnLsb: 100, data: 6, volume: 7, expression: 11 } as const;
const PITCH = {
  c2: 36,
  g2: 43,
  c3: 48,
  d3: 50,
  g3: 55,
  c4: 60,
  d4: 62,
  e4: 64,
  f4: 65,
  g4: 67,
  c5: 72,
} as const;
const DRUM = { kick: 36, snare: 38, hat: 42, crash: 49 } as const;
const VELOCITY = {
  full: 127,
  loud: 120,
  firm: 110,
  strong: 100,
  medium: 90,
  warm: 80,
  soft: 70,
  gentle: 64,
  quiet: 60,
  low: 50,
  faint: 40,
} as const;
const RELEASE = { neutral: 64, soft: 30 } as const;
const BEND = { range: 12, center: 0, quarterUp: 4096, bottom: -8192 } as const;
const PRESSURE = { channel: 33, key: 90 } as const;
const LEVEL = { off: 0, on: 127, volume: 100, expression: 30 } as const;
const TEMPO = { at120: 500_000, at150: 400_000, odd: 476_191 } as const;
const METER = {
  common: { numerator: 4, denominator: 4 },
  odd: { numerator: 7, denominator: 8 },
} as const;
const CLICKS = 24;
const THIRTY_SECONDS = 8;

type WithoutDelta<Event> = Event extends MidiEvent ? Omit<Event, "deltaTime"> : never;

type EventBody = WithoutDelta<MidiEvent>;

interface At {
  readonly at: number;
  readonly event: EventBody;
}

const byAt = Order.mapInput(Order.Number, (item: At) => item.at);

const relative: From<readonly At[], readonly MidiEvent[]> = (events) => {
  const sorted = Arr.sort(events, byAt);
  return pipe(
    sorted,
    Arr.map((item, index): MidiEvent => {
      const previous = pipe(
        Arr.get(sorted, index - NEXT),
        Option.match({ onNone: () => ORIGIN, onSome: (before) => before.at }),
      );
      return { deltaTime: item.at - previous, ...item.event };
    }),
  );
};

interface NoteSpec {
  readonly channel: number;
  readonly at: number;
  readonly length: number;
  readonly pitch: number;
  readonly velocity: number;
  readonly release?: number;
}

const note: From<NoteSpec, readonly At[]> = ({ channel, at, length, pitch, velocity, release }) => [
  { at, event: { type: "noteOn", channel, noteNumber: pitch, velocity } },
  {
    at: at + length,
    event: { type: "noteOff", channel, noteNumber: pitch, velocity: release ?? RELEASE.neutral },
  },
];

const meta: From<readonly [number, EventBody], At> = ([at, event]) => ({ at, event });

interface Signature {
  readonly numerator: number;
  readonly denominator: number;
}

const timeSignature: From<Signature, EventBody> = ({ numerator, denominator }) => ({
  type: "timeSignature",
  meta: true,
  numerator,
  denominator,
  metronome: CLICKS,
  thirtyseconds: THIRTY_SECONDS,
});

const conductor: readonly At[] = pipe(
  [
    [ORIGIN, { type: "trackName", meta: true, text: "Every Element" }],
    [ORIGIN, timeSignature(METER.common)],
    [ORIGIN, { type: "setTempo", meta: true, microsecondsPerBeat: TEMPO.at120 }],
    [ORIGIN, { type: "marker", meta: true, text: "Intro" }],
    [BAR + HALF, { type: "setTempo", meta: true, microsecondsPerBeat: TEMPO.at150 }],
    [BAR + BAR, timeSignature(METER.odd)],
    [BAR + BAR, { type: "setTempo", meta: true, microsecondsPerBeat: TEMPO.odd }],
    [BAR + BAR, { type: "marker", meta: true, text: 'Odd "meter"' }],
  ] as const,
  Arr.map((entry) => meta(entry)),
);

const pianoNote: From<Omit<NoteSpec, "channel">, readonly At[]> = (spec) =>
  note({ ...spec, channel: PIANO_CHANNEL });

const pianoNotes: readonly At[] = pipe(
  [
    { at: ORIGIN, length: HALF, pitch: PITCH.c4, velocity: VELOCITY.strong },
    { at: ORIGIN, length: HALF, pitch: PITCH.e4, velocity: VELOCITY.strong },
    { at: ORIGIN, length: HALF, pitch: PITCH.g4, velocity: VELOCITY.medium },
    { at: PPQ, length: BAR, pitch: PITCH.c5, velocity: VELOCITY.warm, release: RELEASE.soft },
    { at: HALF, length: THIRD, pitch: PITCH.d4, velocity: VELOCITY.full },
    { at: HALF + THIRD, length: THIRD, pitch: PITCH.e4, velocity: VELOCITY.full },
    { at: HALF + THIRD + THIRD, length: THIRD, pitch: PITCH.f4, velocity: VELOCITY.full },
    { at: BAR + PPQ, length: TINY, pitch: PITCH.c3, velocity: VELOCITY.soft },
    { at: BAR + DOTTED_HALF, length: DOTTED_HALF, pitch: PITCH.d3, velocity: VELOCITY.quiet },
    { at: BAR + BAR, length: ZERO_LENGTH, pitch: PITCH.g3, velocity: VELOCITY.faint },
  ],
  Arr.flatMap((spec) => pianoNote(spec)),
);

const pianoControls: readonly At[] = pipe(
  [
    [ORIGIN, { type: "trackName", meta: true, text: "Grand Piano" }],
    [ORIGIN, { type: "programChange", channel: PIANO_CHANNEL, programNumber: PROGRAM.piano }],
    [
      ORIGIN,
      { type: "controller", channel: PIANO_CHANNEL, controllerType: CC.rpnMsb, value: RPN_BEND },
    ],
    [
      ORIGIN,
      { type: "controller", channel: PIANO_CHANNEL, controllerType: CC.rpnLsb, value: RPN_BEND },
    ],
    [
      ORIGIN,
      { type: "controller", channel: PIANO_CHANNEL, controllerType: CC.data, value: BEND.range },
    ],
    [
      DOTTED_HALF,
      {
        type: "noteAftertouch",
        channel: PIANO_CHANNEL,
        noteNumber: PITCH.c5,
        amount: PRESSURE.key,
      },
    ],
    [BAR + DOTTED_HALF, { type: "lyrics", meta: true, text: "la" }],
    [
      EIGHTH,
      { type: "controller", channel: PIANO_CHANNEL, controllerType: CC.sustain, value: LEVEL.on },
    ],
    [
      BAR - ONE_TICK,
      { type: "controller", channel: PIANO_CHANNEL, controllerType: CC.sustain, value: LEVEL.off },
    ],
    [PPQ, { type: "pitchBend", channel: PIANO_CHANNEL, value: BEND.quarterUp }],
    [PPQ + BEND_SLIDE, { type: "pitchBend", channel: PIANO_CHANNEL, value: BEND.bottom }],
    [BAR, { type: "pitchBend", channel: PIANO_CHANNEL, value: BEND.center }],
    [DOTTED_HALF, { type: "channelAftertouch", channel: PIANO_CHANNEL, amount: PRESSURE.channel }],
    [BAR + HALF, { type: "programChange", channel: PIANO_CHANNEL, programNumber: PROGRAM.organ }],
  ] as const,
  Arr.map((entry) => meta(entry)),
);

const strings: readonly At[] = [
  meta([
    ORIGIN,
    { type: "programChange", channel: STRINGS_CHANNEL, programNumber: PROGRAM.strings },
  ]),
  ...note({
    channel: STRINGS_CHANNEL,
    at: 0,
    length: BAR + BAR + PPQ,
    pitch: PITCH.g2,
    velocity: VELOCITY.gentle,
  }),
  meta([
    ORIGIN,
    {
      type: "controller",
      channel: STRINGS_CHANNEL,
      controllerType: CC.volume,
      value: LEVEL.volume,
    },
  ]),
  meta([
    BAR,
    {
      type: "controller",
      channel: STRINGS_CHANNEL,
      controllerType: CC.expression,
      value: LEVEL.expression,
    },
  ]),
];

const drumNote: From<Omit<NoteSpec, "channel">, readonly At[]> = (spec) =>
  note({ ...spec, channel: DRUM_CHANNEL });

const drums: readonly At[] = [
  meta([ORIGIN, { type: "trackName", meta: true, text: "Drums" }]),
  ...pipe(
    [
      { at: ORIGIN, length: SIXTEENTH, pitch: DRUM.kick, velocity: VELOCITY.loud },
      { at: ORIGIN, length: SIXTEENTH, pitch: DRUM.hat, velocity: VELOCITY.soft },
      { at: PPQ, length: SIXTEENTH, pitch: DRUM.snare, velocity: VELOCITY.firm },
      { at: PPQ, length: SIXTEENTH, pitch: DRUM.snare, velocity: VELOCITY.low },
      { at: BAR - EIGHTH, length: PPQ, pitch: DRUM.crash, velocity: VELOCITY.full },
      { at: BAR + BAR, length: SIXTEENTH, pitch: DRUM.kick, velocity: VELOCITY.full },
    ],
    Arr.flatMap((spec) => drumNote(spec)),
  ),
];

const ended = (track: readonly At[]): MidiEvent[] => [
  ...relative(track),
  { deltaTime: NO_DELAY, meta: true, type: "endOfTrack" },
];

const TRACKS: readonly (readonly At[])[] = [
  conductor,
  [...pianoNotes, ...pianoControls, ...strings],
  drums,
  [],
];

export const everyElement = (): Uint8Array => {
  const tracks = pipe(
    TRACKS,
    Arr.map((track) => ended(track)),
  );
  return Uint8Array.from(
    writeMidi({ header: { format: 1, numTracks: tracks.length, ticksPerBeat: PPQ }, tracks }),
  );
};

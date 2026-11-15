import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type {
  Automation,
  NoteEvent,
  RenderSession,
  Rendered,
  Samples,
  Song,
  Take,
} from "./index.ts";

const SAMPLE_RATE = 44_100;
const TIMING = { tempo: 120, swing: 0.5, bars: 8, tail: 0.5 } as const;
const BAR = 2;
const BEAT = 0.5;
const STEP = 0.125;
const COUNT = { beats: 32, steps: 128, bars: 8 } as const;
const DROP = 4;
const KICK = { duration: 0.2, gain: 1 } as const;
const HAT = { delay: 0.25, duration: 0.08, gain: 0.5 } as const;
const BASS = { pitch: 36, rise: 2, turn: 4, duration: 1.5, gain: 0.8, fall: -5, land: 1 } as const;
const LEAD = { pitch: 60, rise: 3, turn: 4, duration: 0.1, gain: 0.6 } as const;
const VOICE = { bar: 6, duration: 2, gain: 0.7, offset: 0.5 } as const;
const FILTER = { low: 150, high: 20_000 } as const;
const TONE = {
  tuning: 440,
  reference: 69,
  octave: 12,
  decay: 0.08,
  fixed: 180,
  level: 0.4,
} as const;
const NONE = 0;
const ONE = 1;
const TWO = 2;
const HALF = 0.5;
const TURN = Math.PI * TWO;

const placed = { offset: NONE, reversed: false } as const;

const kick = (beat: number): NoteEvent => ({
  ...placed,
  kind: "hit",
  track: "DRUMS",
  sample: "click",
  start: beat * BEAT,
  ...KICK,
});

const hat = (beat: number): NoteEvent => ({
  ...placed,
  kind: "hit",
  track: "DRUMS",
  sample: "hat",
  start: beat * BEAT + HAT.delay,
  duration: HAT.duration,
  gain: HAT.gain,
});

const slide = (bar: number): Extract<NoteEvent, { kind: "note" }>["glide"] => {
  if (bar % TWO === ONE) {
    return [
      { at: NONE, semitones: NONE },
      { at: BASS.land, semitones: BASS.fall },
    ];
  }
  return [];
};

const bass = (bar: number): NoteEvent => ({
  ...placed,
  kind: "note",
  track: "BASS",
  sample: "sub",
  start: bar * BAR,
  duration: BASS.duration,
  gain: BASS.gain,
  pitch: BASS.pitch + (bar % BASS.turn) * BASS.rise,
  glide: slide(bar),
});

const lead = (step: number): NoteEvent => ({
  ...placed,
  kind: "note",
  track: "LEAD",
  sample: "pluck",
  start: DROP * BAR + step * STEP,
  duration: LEAD.duration,
  gain: LEAD.gain,
  pitch: LEAD.pitch + (step % LEAD.turn) * LEAD.rise,
  glide: [],
});

const voice: NoteEvent = {
  kind: "hit",
  track: "VOICE SEND",
  sample: "ah",
  start: VOICE.bar * BAR,
  duration: VOICE.duration,
  gain: VOICE.gain,
  offset: VOICE.offset,
  reversed: true,
};

const drums = pipe(
  Arr.range(NONE, COUNT.beats - ONE),
  Arr.flatMap((beat) => [kick(beat), hat(beat)]),
);

const filter: Automation = {
  name: "FILTER",
  values: Arr.makeBy(
    COUNT.steps + ONE,
    (index) => FILTER.low * (FILTER.high / FILTER.low) ** (index / COUNT.steps),
  ),
  low: FILTER.low,
  high: FILTER.high,
  scale: "log",
  unit: "Hz",
  shade: true,
};

const roots = Arr.makeBy(COUNT.bars, (bar) => BASS.pitch + (bar % BASS.turn) * BASS.rise);

const early: Take = { events: drums, automation: [], roots };

const whole: Take = {
  events: [
    ...drums,
    ...Arr.makeBy(COUNT.bars, bass),
    ...Arr.makeBy((COUNT.bars - DROP) * (BAR / STEP), lead),
    voice,
  ],
  automation: [filter],
  roots,
};

const frequencyOf = (event: NoteEvent): number => {
  if (event.kind === "note") {
    return TONE.tuning * TWO ** ((event.pitch - TONE.reference) / TONE.octave);
  }
  return TONE.fixed;
};

const toneOf = (event: NoteEvent): Float32Array => {
  const frequency = frequencyOf(event);
  return Float32Array.from(
    { length: Math.round(event.duration * SAMPLE_RATE) },
    (_unused, frame) => {
      const seconds = frame / SAMPLE_RATE;
      return Math.sin(TURN * frequency * seconds) * Math.exp(-seconds / TONE.decay) * TONE.level;
    },
  );
};

const soundOf =
  (samples: Samples) =>
  (event: NoteEvent): Float32Array =>
    pipe(
      Rec.get(samples, event.sample),
      Option.getOrElse(() => toneOf(event)),
    );

const mixed = (samples: Samples): Float32Array => {
  const seconds = TIMING.bars * BAR + TIMING.tail;
  const mix = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const sound = soundOf(samples);
  for (const event of whole.events) {
    const first = Math.round(event.start * SAMPLE_RATE);
    for (const [frame, value] of sound(event).entries()) {
      mix[first + frame] = (mix[first + frame] ?? NONE) + value * event.gain;
    }
  }
  return mix;
};

export interface Fixture {
  readonly song: Song;
  readonly heard: () => Samples;
}

const SONG = {
  ...TIMING,
  title: "test tone",
  facts: ["fixture", "120 BPM", "C minor"],
  sections: [
    { name: "intro", from: NONE, to: DROP },
    { name: "drop", from: DROP, to: COUNT.bars },
  ],
  marks: [
    { bar: NONE, label: "start" },
    { bar: DROP, label: "drop" },
  ],
  tracks: [
    { name: "DRUMS", hue: 52, tone: "full" },
    { name: "BASS", hue: 262, tone: "full" },
    { name: "LEAD", hue: 188, tone: "full" },
    { name: "VOICE SEND", hue: 352, tone: "faint" },
  ],
  credits: [
    { what: "click", source: "made for this test", license: "CC0", href: "https://example.com/" },
  ],
  sampleRate: SAMPLE_RATE,
} as const satisfies Partial<Song>;

export const fixtureOf = (samples: Readonly<Record<string, string>>): Fixture => {
  let heard: Samples = {};
  const render = (session: RenderSession): Promise<Rendered> => {
    heard = session.samples;
    session.report({ share: HALF, label: "drums", take: early });
    const mix = mixed(session.samples);
    return Promise.resolve({ left: mix, right: mix, take: whole });
  };
  return { song: { ...SONG, samples, render }, heard: () => heard };
};

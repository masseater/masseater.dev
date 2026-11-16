import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

import { choir } from "./choir.ts";
import type { Life } from "./context.ts";
import { chordOf } from "./harmony.ts";
import { chop, say } from "./voices.ts";

const TWO = 2;

const NONE = 0;
const ONE = 1;
const OCTAVE = 12;
const DREAM = {
  notes: patterns.dream.notes,
  mode: "akai",
  lead: { grain: 0.06, gain: 0.95, send: 0.4, delay: 0.2 },
  parts: [
    { singer: "f8", note: 0, grain: 0.052, pan: 0.5, gain: 0.75, send: 0.4 },
    { singer: "f5", note: 1, grain: 0.047, pan: -0.35, gain: 0.5, send: 0.5 },
    { singer: "m5", note: 0, grain: 0.065, pan: -0.55, gain: 0.85, send: 0.4 },
    { singer: "m2", note: 2, grain: 0.07, pan: 0.3, gain: 0.7, send: 0.4 },
  ],
  word: 4,
};

export interface Dream {
  readonly time: number;
  readonly seconds: number;
  readonly transpose: number;
  readonly gain: number;
  readonly notes?: readonly number[];
  readonly mode?: string;
}

export const dream =
  (life: Life) =>
  ({ time, seconds, transpose, gain, notes = DREAM.notes, mode }: Dream): void => {
    const sung = mode ?? DREAM.mode;
    const keyAt = (index: number): number => (notes[index] ?? NONE) + transpose;
    say(life)({
      bus: "VOICES",
      syllable: "dream",
      key: keyAt(NONE),
      time,
      seconds,
      mode: sung,
      ...DREAM.lead,
      gain: DREAM.lead.gain * gain,
    });
    for (const part of DREAM.parts) {
      choir(life)({
        bus: "VOICES",
        singer: part.singer,
        index: DREAM.word,
        key: keyAt(part.note),
        time,
        seconds,
        mode: sung,
        grain: part.grain,
        pan: part.pan,
        gain: part.gain * gain,
        send: part.send,
      });
    }
  };

const MOSAIC = {
  cycle: 4,
  spread: 3,
  longAt: 2,
  long: 0.95,
  short: 0.62,
  gain: 0.46,
  pan: 0.62,
  skip: 0.03,
  low: 62,
  high: 77,
  placement: { highPass: 320, send: 0.22, attack: 2e-3, release: 0.012 },
};

const sixteenthsOf = (long: boolean): number => {
  if (long) {
    return MOSAIC.long;
  }
  return MOSAIC.short;
};

const panOf = (index: number): number => {
  if (index % TWO === ONE) {
    return MOSAIC.pan;
  }
  return -MOSAIC.pan;
};

interface MosaicVoice {
  readonly voice: string;
  readonly transpose: number;
  readonly prefer: number;
}

const VOICES: readonly MosaicVoice[] = patterns.mosaic.voices;

const loweredOf = (key: number, voice: MosaicVoice): number => {
  if (voice.transpose !== NONE) {
    const lowered = key - OCTAVE;
    if (lowered > MOSAIC.low) {
      return lowered - OCTAVE;
    }
    return lowered;
  }
  if (key > MOSAIC.high) {
    return key - OCTAVE;
  }
  return key;
};

export interface Mosaic {
  readonly bar: number;
  readonly level: number;
  readonly density: number;
}

const tile = (
  life: Life,
  { bar, level }: Mosaic,
  [index, step]: readonly [number, number],
): void => {
  const voice = VOICES[(index + bar) % VOICES.length] ?? {
    voice: "",
    transpose: NONE,
    prefer: NONE,
  };
  const key = chordOf(bar).keys[(index * MOSAIC.spread + bar) % MOSAIC.cycle] ?? NONE;
  const long = index % MOSAIC.spread === MOSAIC.longAt;
  chop(life)({
    bus: "VOICES",
    voice: voice.voice,
    key: loweredOf(key, voice),
    time: life.grid.at(bar, step),
    seconds: life.grid.sixteenth * sixteenthsOf(long),
    gain: MOSAIC.gain * level,
    pan: panOf(index),
    prefer: voice.prefer,
    skip: MOSAIC.skip * (index % MOSAIC.spread),
    ...MOSAIC.placement,
  });
};

export const mosaic =
  (life: Life) =>
  (spec: Mosaic): void => {
    const steps = patterns.mosaic.steps[spec.bar % MOSAIC.cycle] ?? [];
    for (const [index, step] of steps.entries()) {
      if (life.random() <= spec.density) {
        tile(life, spec, [index, step]);
      }
    }
  };

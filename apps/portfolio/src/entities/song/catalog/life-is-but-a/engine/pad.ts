import { orDefault } from "@masseater.dev/fumx-studio/dsp/number";

import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

import { entryOf } from "./context.ts";
import type { Life } from "./context.ts";
import { pasteAt } from "./hits.ts";

const ONE = 1;
const NONE = 0;
const OCTAVE = 12;
const PAD = {
  sources: ["pad_302589", "pad_302592", "pad_302600"],
  pans: patterns.pad.pans,
  attack: 0.25,
  release: 0.5,
  gain: 0.16,
  lowPass: 5e3,
};

export interface PadChord {
  readonly bar: number;
  readonly bars: number;
  readonly keys: readonly number[];
  readonly gain?: number;
  readonly lowPass?: number;
}

const midiOf = (life: Life, name: string): number => entryOf(life)(name).midi ?? NONE;

const nearest = (life: Life, key: number): string => {
  let best = PAD.sources[NONE] ?? "";
  for (const name of PAD.sources) {
    if (Math.abs(midiOf(life, name) - key) < Math.abs(midiOf(life, best) - key)) {
      best = name;
    }
  }
  return best;
};

export const padChord =
  (life: Life) =>
  ({ bar, bars, keys, gain, lowPass }: PadChord): void => {
    const time = life.grid.at(bar, NONE);
    const duration = bars * life.grid.bar;
    for (const [index, key] of keys.entries()) {
      const lowered = key - OCTAVE;
      const source = nearest(life, lowered);
      pasteAt(life)("PAD", source)(time, {
        semitones: lowered - midiOf(life, source),
        duration,
        attack: PAD.attack,
        release: PAD.release,
        gain: PAD.gain * orDefault(ONE)(gain),
        pan: PAD.pans[index % PAD.pans.length] ?? NONE,
        lowPass: orDefault(PAD.lowPass)(lowPass),
      });
    }
  };

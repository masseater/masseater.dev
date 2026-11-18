import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import { randomFrom } from "@masseater.dev/fumx-studio/dsp/random";
import type { Label, Ledger } from "@masseater.dev/fumx-studio/studio/placement";
import { studioOf } from "@masseater.dev/fumx-studio/studio/studio";
import { Option } from "effect";

import form from "#/entities/song/catalog/life-is-but-a/score/form.json";

import type { Life, SampleTableEntry, Sink } from "./context.ts";
import { rackOf } from "./rack.ts";

const SECONDS_PER_BAR_AT_ONE_BPM = 240;
const SEED = 1997;
const CONTROL_RATE = 16;
const SPARE = 2;
const RESTING_CUTOFF = 160;

export const SECONDS = (form.BARS * SECONDS_PER_BAR_AT_ONE_BPM) / form.BPM + form.TAIL;

export const FRAMES = Math.ceil(SECONDS * SAMPLE_RATE);

export interface Setup {
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleTableEntry>>;
  readonly log: Option.Option<Ledger>;
  readonly tape: Option.Option<Sink>;
}

export const lifeOf = ({ samples, table, log, tape }: Setup): Life => {
  const labels = new Map<Float32Array, Label>();
  const words = new Map<string, Float32Array>();
  const session = {
    samples,
    table,
    seconds: SECONDS,
    tempo: form.BPM,
    swing: form.SWING,
    labelOf: (sample: Float32Array): Label => labels.get(sample) ?? {},
    quiet: (): boolean => false,
  };
  const studio = studioOf({ ...session, log });
  const kicks: number[] = [];
  return {
    studio,
    quiet: studioOf({ ...session, log: Option.none() }),
    grid: studio.grid,
    random: randomFrom(SEED),
    rack: rackOf(studio),
    kicks: {
      add: (time) => {
        kicks.push(time);
      },
      all: () => kicks,
    },
    cutoffs: new Float32Array(Math.ceil(studio.frames / CONTROL_RATE) + SPARE).fill(RESTING_CUTOFF),
    samples,
    table,
    labelled: (sample, label) => {
      labels.set(sample, label);
    },
    words: {
      get: (key) => words.get(key),
      set: (key, sample) => {
        words.set(key, sample);
      },
    },
    tape,
  };
};

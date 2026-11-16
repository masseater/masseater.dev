import type { Impulse } from "#/entities/song/lib/dsp/convolve-pair.ts";
import { SVF, svf } from "#/entities/song/lib/dsp/filter.ts";
import { resample } from "#/entities/song/lib/dsp/sampling.ts";

const PLATE_TAIL = 2048;
const HALL_TAIL = 4096;
const HALL_RATE = 0.5;
const PLATE = { low: 300, high: 8500, resonance: 0.7 } as const;
const HALL_LOW = 220;

export type ImpulseSamples = Readonly<Record<string, Float32Array>>;

const tailed = (impulse: Float32Array, frames: number): Float32Array => {
  const longer = new Float32Array(impulse.length + frames);
  longer.set(impulse);
  return longer;
};

const impulseOf = (samples: ImpulseSamples, name: string): Float32Array =>
  samples[name] ?? new Float32Array();

export const plateOf = (samples: ImpulseSamples): Impulse => {
  const left = tailed(impulseOf(samples, "irL"), PLATE_TAIL);
  const right = tailed(impulseOf(samples, "irR"), PLATE_TAIL);
  for (const channel of [left, right]) {
    svf({ kind: SVF.high, cutoff: PLATE.low, resonance: PLATE.resonance })(channel);
    svf({ kind: SVF.low, cutoff: PLATE.high, resonance: PLATE.resonance })(channel);
  }
  return { left, right };
};

export const hallOf = (samples: ImpulseSamples): Impulse => {
  const half = resample({ rate: HALL_RATE });
  const left = tailed(half(impulseOf(samples, "irL")), HALL_TAIL);
  const right = tailed(half(impulseOf(samples, "irR")), HALL_TAIL);
  for (const channel of [left, right]) {
    svf({ kind: SVF.high, cutoff: HALL_LOW, resonance: PLATE.resonance })(channel);
  }
  return { left, right };
};

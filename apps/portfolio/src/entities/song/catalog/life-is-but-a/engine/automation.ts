import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import type { Lane } from "#/entities/song/model/program.ts";

import type { Life } from "./context.ts";
import { wallsOf } from "./wall.ts";

const NONE = 0;
const ONE = 1;

const STEPS_PER_BAR = 16;
const CONTROL_RATE = 16;
const BARS = 80;
const LANES = {
  wall: { low: 150, high: 2e4, log: 1, unit: "Hz" },
  gain: { low: 0, high: 1, unit: "" },
  bass: { low: 150, high: 3e3, log: 1, unit: "Hz" },
} as const;

const bassLane = (life: Life, count: number): Float32Array => {
  const lane = new Float32Array(count);
  const span = (life.grid.bar * SAMPLE_RATE) / STEPS_PER_BAR / CONTROL_RATE;
  for (let point = 0; point < count - ONE; point += ONE) {
    let most = 0;
    for (
      let index = Math.floor(point * span);
      index < (point + ONE) * span && index < life.cutoffs.length;
      index += ONE
    ) {
      const value = life.cutoffs[index] ?? NONE;
      if (value > most) {
        most = value;
      }
    }
    lane[point] = most;
  }
  return lane;
};

export const automationOf = (life: Life): Readonly<Record<string, Lane>> => {
  const count = BARS * STEPS_PER_BAR + ONE;
  const walls = wallsOf(life.grid);
  const cutoff = new Float32Array(count);
  const gain = new Float32Array(count);
  for (let point = 0; point < count; point += ONE) {
    const time = (point * life.grid.bar) / STEPS_PER_BAR;
    cutoff[point] = walls.cutoff(time);
    gain[point] = walls.gain(time);
  }
  return {
    "WALL LP": { values: cutoff, ...LANES.wall },
    "WALL GAIN": { values: gain, ...LANES.gain },
    "BASS FILTER": { values: bassLane(life, count), ...LANES.bass },
  };
};

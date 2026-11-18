import { Array as Arr, pipe } from "effect";

import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";

import type { Bus } from "./bus.ts";

const BLOCK = 2048;
const PROBE = 3;
const LEAD = 64;
const DEFAULT_PAD = 0.3;
const SILENT = 0;
const FIRST = 0;
const END = 1;

export type Region = readonly [start: number, end: number];

export interface Activity {
  readonly frames: number;
  readonly pad?: number;
}

const heard = (bus: Bus, from: number, to: number): boolean => {
  for (let index = from; index < to; index += PROBE) {
    if (bus.left[index] !== SILENT || bus.right[index] !== SILENT) {
      return true;
    }
  }
  return false;
};

interface Collector {
  readonly add: (from: number, to: number) => void;
  readonly regions: (frames: number) => readonly Region[];
}

const collector = (padding: number): Collector => {
  const starts: number[] = [];
  const ends: number[] = [];
  return {
    add: (from, to) => {
      const last = ends.length - END;
      if (last >= FIRST && from <= (ends[last] ?? SILENT) + padding) {
        ends[last] = to;
        return;
      }
      starts.push(Math.max(FIRST, from - LEAD));
      ends.push(to);
    },
    regions: (frames) =>
      pipe(
        starts,
        Arr.map((start, index) => [start, Math.min(frames, (ends[index] ?? SILENT) + padding)]),
      ),
  };
};

export const activeIn =
  ({ frames, pad }: Activity) =>
  (bus: Bus): readonly Region[] => {
    const found = collector(Math.round((pad ?? DEFAULT_PAD) * SAMPLE_RATE));
    for (let from = FIRST; from < frames; from += BLOCK) {
      const to = Math.min(frames, from + BLOCK);
      if (heard(bus, from, to)) {
        found.add(from, to);
      }
    }
    return found.regions(frames);
  };

export type ChannelEdit = (channel: Float32Array, from: number, to: number) => void;

export interface Each extends Activity {
  readonly edit: ChannelEdit;
}

export const eachActive =
  ({ edit, ...activity }: Each) =>
  (bus: Bus): void => {
    for (const [from, to] of activeIn(activity)(bus)) {
      edit(bus.left, from, to);
      if (!bus.mono) {
        edit(bus.right, from, to);
      }
    }
  };

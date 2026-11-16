import { SAMPLE_RATE, decibels } from "#/entities/song/lib/dsp/number.ts";
import { truePeakAt } from "#/entities/song/lib/dsp/true-peak.ts";

import type { Bus } from "./bus.ts";
import { heldCurve } from "./dynamics.ts";

const ONE = 1;
const NONE = 0;
const MILLI = 1e-3;

export interface Limiting {
  readonly ceiling: number;
  readonly lookahead: number;
  readonly release: number;
  readonly every: number;
  readonly truePeak?: boolean;
}

export interface Limited {
  readonly curve: Float32Array<ArrayBuffer>;
  readonly least: number;
}

const wantedOf = (peak: number, ceiling: number): number => {
  if (peak > ceiling) {
    return ceiling / peak;
  }
  return ONE;
};

type Peak = (bus: Bus, index: number) => number;

const samplePeak: Peak = (bus, index) =>
  Math.max(Math.abs(bus.left[index] ?? NONE), Math.abs(bus.right[index] ?? NONE));

const peakOf = (ceiling: number, truePeak?: boolean): Peak => {
  if (truePeak !== true) {
    return samplePeak;
  }
  const between = truePeakAt(ceiling);
  return (bus, index) =>
    Math.max(samplePeak(bus, index), between(bus.left, index), between(bus.right, index));
};

const requests = (bus: Bus, ceiling: number, peakAt: Peak): Float32Array => {
  const wanted = new Float32Array(bus.left.length);
  for (let index = NONE; index < wanted.length; index += ONE) {
    const peak = peakAt(bus, index);
    wanted[index] = wantedOf(peak, ceiling);
  }
  return wanted;
};

interface Deque {
  readonly push: (at: number) => void;
  readonly front: (index: number) => number;
}

const dequeOf = (wanted: Float32Array): Deque => {
  const queue = new Int32Array(wanted.length);
  const ends = { head: NONE, tail: NONE };
  const valueAt = (slot: number): number => wanted[queue[slot] ?? NONE] ?? NONE;
  return {
    push: (at) => {
      while (ends.tail > ends.head && valueAt(ends.tail - ONE) >= (wanted[at] ?? NONE)) {
        ends.tail -= ONE;
      }
      queue[ends.tail] = at;
      ends.tail += ONE;
    },
    front: (index) => {
      while ((queue[ends.head] ?? NONE) < index) {
        ends.head += ONE;
      }
      return valueAt(ends.head);
    },
  };
};

const windowMinimum = (wanted: Float32Array, ahead: number): Float32Array => {
  const frames = wanted.length;
  const least = new Float32Array(frames);
  const deque = dequeOf(wanted);
  let next = NONE;
  for (let index = NONE; index < frames; index += ONE) {
    const end = Math.min(frames - ONE, index + ahead);
    for (; next <= end; next += ONE) {
      deque.push(next);
    }
    least[index] = deque.front(index);
  }
  return least;
};

const releasedTo = (envelope: number, target: number, release: number): number => {
  if (target < envelope) {
    return target;
  }
  return envelope + (target - envelope) * release;
};

const released = (least: Float32Array, release: number): void => {
  let envelope = ONE;
  for (let index = NONE; index < least.length; index += ONE) {
    envelope = releasedTo(envelope, least[index] ?? NONE, release);
    least[index] = envelope;
  }
};

const averaged = (least: Float32Array, into: Float32Array, ahead: number): void => {
  let sum = NONE;
  for (let index = NONE; index < least.length; index += ONE) {
    sum += least[index] ?? NONE;
    if (index >= ahead) {
      sum -= least[index - ahead] ?? NONE;
    }
    into[index] = least[index] ?? NONE;
    if (index >= ahead - ONE) {
      into[index] = sum / ahead;
    }
  }
};

const lowestIn = (smooth: Float32Array, from: number, to: number): number => {
  let lowest = ONE;
  for (let index = from; index < to; index += ONE) {
    const value = smooth[index] ?? NONE;
    if (value < lowest) {
      lowest = value;
    }
  }
  return lowest;
};

const decimated = (smooth: Float32Array, every: number): Limited => {
  const curve = heldCurve(smooth.length)({ every, level: ONE });
  let least = ONE;
  for (let point = NONE; point < curve.length; point += ONE) {
    const from = Math.max(NONE, point * every - every);
    const lowest = lowestIn(smooth, from, Math.min(smooth.length, point * every + every + ONE));
    curve[point] = lowest;
    least = Math.min(least, lowest);
  }
  return { curve, least };
};

export const limitCurve =
  ({ ceiling, lookahead, release, every, truePeak }: Limiting) =>
  (bus: Bus): Limited => {
    const ahead = Math.round(lookahead * MILLI * SAMPLE_RATE);
    const level = decibels(ceiling);
    const wanted = requests(bus, level, peakOf(level, truePeak));
    const least = windowMinimum(wanted, ahead);
    released(least, ONE - Math.exp(-ONE / (release * MILLI * SAMPLE_RATE)));
    averaged(least, wanted, ahead);
    return decimated(wanted, every);
  };

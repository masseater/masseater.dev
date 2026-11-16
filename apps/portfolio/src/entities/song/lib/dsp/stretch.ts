import { SAMPLE_RATE, orDefault } from "./number.ts";
import constants from "./tuning.json";

const ONE = 1;
const TWO = 2;
const HALF = 0.5;
const FIRST = 0;
const STEP = 1;
const SILENT = 0;
const SEARCH_STEP = 2;
const CORRELATION_STEP = 3;
const SEARCH_SECONDS = 8e-3;
const AKAI_SHARE = 0.22;
const AKAI_SHORTEST = 8;
const TOLERANCE = Math.round(SEARCH_SECONDS * SAMPLE_RATE);

export interface Stretching {
  readonly ratio: number;
  readonly grain?: number;
  readonly mode?: "akai" | "smooth";
}

interface Layout {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly ratio: number;
  readonly grain: number;
  readonly length: number;
}

const akaiWeight = (index: number, grain: number, overlap: number): number => {
  if (index < FIRST) {
    return (index + overlap) / overlap;
  }
  if (index >= grain - overlap) {
    return (grain - index) / overlap;
  }
  return ONE;
};

const akaiGrain = (layout: Layout, at: number, overlap: number): void => {
  const { x, y, ratio, grain } = layout;
  const source = Math.floor(at / ratio);
  for (let index = -overlap; index < grain; index += STEP) {
    const out = at + index;
    const from = source + index;
    if (out >= FIRST && out < y.length && from >= FIRST && from < x.length) {
      y[out] = (y[out] ?? SILENT) + (x[from] ?? SILENT) * akaiWeight(index, grain, overlap);
    }
  }
};

const akai = (layout: Layout): void => {
  const overlap = Math.max(AKAI_SHORTEST, Math.round(layout.grain * AKAI_SHARE));
  for (let at = FIRST; at < layout.length; at += layout.grain) {
    akaiGrain(layout, at, overlap);
  }
};

const windowOf = (grain: number): Float32Array => {
  const window = new Float32Array(grain);
  for (let index = FIRST; index < grain; index += STEP) {
    window[index] = HALF - HALF * Math.cos((TWO * Math.PI * index) / grain);
  }
  return window;
};

const correlation = (
  x: Float32Array,
  [candidate, target, hop]: readonly [number, number, number],
): number => {
  let sum = SILENT;
  for (let index = FIRST; index < hop; index += CORRELATION_STEP) {
    sum += (x[candidate + index] ?? SILENT) * (x[target + index] ?? SILENT);
  }
  return sum;
};

const bestShift = (
  x: Float32Array,
  [source, target, hop]: readonly [number, number, number],
): number => {
  let best = FIRST;
  let bestScore = -Infinity;
  for (let shift = -TOLERANCE; shift <= TOLERANCE; shift += SEARCH_STEP) {
    const candidate = source + shift;
    if (candidate >= FIRST && candidate + hop < x.length && target + hop < x.length) {
      const score = correlation(x, [candidate, target, hop]);
      if (score > bestScore) {
        bestScore = score;
        best = shift;
      }
    }
  }
  return best;
};

const aligned = (
  x: Float32Array,
  [source, previous, hop]: readonly [number, number, number],
): number => source + bestShift(x, [source, previous + hop, hop]);

const overlapped = (
  layout: Layout,
  window: Float32Array,
  [at, source]: readonly [number, number],
): void => {
  const { x, y, grain } = layout;
  for (let index = FIRST; index < grain; index += STEP) {
    const from = source + index;
    if (from >= FIRST && from < x.length && at + index < y.length) {
      y[at + index] = (y[at + index] ?? SILENT) + (x[from] ?? SILENT) * (window[index] ?? SILENT);
    }
  }
};

const smooth = (layout: Layout): void => {
  const hop = Math.floor(layout.grain / TWO);
  const window = windowOf(layout.grain);
  let previous = FIRST;
  for (let at = FIRST; at < layout.length; at += hop) {
    let source = Math.floor(at / layout.ratio);
    if (at > FIRST) {
      source = aligned(layout.x, [source, previous, hop]);
    }
    overlapped(layout, window, [at, source]);
    previous = source;
  }
};

export const stretch =
  ({ ratio, grain, mode }: Stretching) =>
  (x: Float32Array): Float32Array => {
    const size = Math.round(orDefault(constants.defaultGrain)(grain) * SAMPLE_RATE);
    const length = Math.floor(x.length * ratio);
    const layout = { x, y: new Float32Array(length + size), ratio, grain: size, length };
    if (mode === "akai") {
      akai(layout);
    } else {
      smooth(layout);
    }
    return layout.y.subarray(FIRST, length);
  };

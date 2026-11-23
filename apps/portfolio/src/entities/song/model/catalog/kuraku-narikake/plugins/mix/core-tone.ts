import { filtered, filteredInto, flushed } from "./coefficients.ts";
import type { Coefficients } from "./coefficients.ts";
import type { Core } from "./core-state.ts";
import { keepSideLow, sideLowOf } from "./core-state.ts";
import { MASTERING } from "./mastering.ts";

const ONE = 1;
const HALF = 0.5;
const SLOTS = 2;
const CHANNEL_SLOTS = 4;
const SILENT = 0;
const FIRST = 0;

const pairFiltered = (
  { state, buffers }: Core,
  coefficients: Coefficients,
  [slot, frames]: readonly [number, number],
): void => {
  filtered({ coefficients, state, slot })(buffers.left, frames);
  filtered({ coefficients, state, slot: slot + SLOTS })(buffers.right, frames);
};

const sideSplit = (core: Core, frames: number): void => {
  const { left, right, mid, side } = core.buffers;
  let low = sideLowOf(core);
  for (let index = FIRST; index < frames; index += ONE) {
    const leftValue = left[index] ?? SILENT;
    const rightValue = right[index] ?? SILENT;
    mid[index] = (leftValue + rightValue) * HALF;
    const value = (leftValue - rightValue) * HALF;
    low += core.mono * (value - low);
    side[index] = value - low;
  }
  keepSideLow(flushed(low))(core);
};

const widened = (core: Core, frames: number): void => {
  const { left, right, mid, side } = core.buffers;
  sideSplit(core, frames);
  for (let index = FIRST; index < frames; index += ONE) {
    const value = (side[index] ?? SILENT) * MASTERING.width;
    left[index] = (mid[index] ?? SILENT) + value;
    right[index] = (mid[index] ?? SILENT) - value;
  }
};

export const coreToned =
  (frames: number) =>
  (core: Core): number => {
    let slot = FIRST;
    for (const coefficients of [core.filters.highPass, ...core.filters.eq]) {
      pairFiltered(core, coefficients, [slot, frames]);
      slot += CHANNEL_SLOTS;
    }
    widened(core, frames);
    return slot;
  };

const BAND_SLOTS = 18;
const AT = {
  low: 0,
  lowAgain: 2,
  allPass: 4,
  high: 6,
  highAgain: 8,
  mid: 10,
  midAgain: 12,
  top: 14,
  topAgain: 16,
} as const;

type Triple = readonly [Float32Array, Float32Array, Float32Array];

const channelSplit = (
  { filters, state, buffers: { scratch } }: Core,
  [channel, [low, mid, high]]: readonly [Float32Array, Triple],
  [slot, frames]: readonly [number, number],
): void => {
  const into =
    (
      coefficients: Coefficients,
      at: number,
    ): ((source: Float32Array, target: Float32Array) => void) =>
    (source, target) => {
      filteredInto({ coefficients, state, slot: slot + at })(source, target, frames);
    };
  into(filters.lowFirst, AT.low)(channel, low);
  into(filters.lowFirst, AT.lowAgain)(low, low);
  into(filters.allPass, AT.allPass)(low, low);
  into(filters.highFirst, AT.high)(channel, scratch);
  into(filters.highFirst, AT.highAgain)(scratch, scratch);
  into(filters.lowSecond, AT.mid)(scratch, mid);
  into(filters.lowSecond, AT.midAgain)(mid, mid);
  into(filters.highSecond, AT.top)(scratch, high);
  into(filters.highSecond, AT.topAgain)(high, high);
};

export const split =
  ([start, frames]: readonly [number, number]) =>
  (core: Core): void => {
    const [leftBands, rightBands] = core.buffers.bands;
    channelSplit(core, [core.buffers.left, leftBands], [start, frames]);
    channelSplit(core, [core.buffers.right, rightBands], [start + BAND_SLOTS, frames]);
  };

import { Option } from "effect";

import { SAMPLE_RATE, isGiven, orDefault, semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import { readAt } from "#/entities/song/lib/dsp/sampling.ts";

import type { Bus } from "./bus.ts";
import { fieldOf } from "./field.ts";
import type { Desk } from "./paste.ts";

const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const EDGE = 64;
const LONGEST_FADE = 96;
const FADE_SHARE = 8;
const STOPPING = 0.2;
const STOP_CURVE = 6;
const EDIT = "EDIT";

export interface Edit {
  readonly label: string;
  readonly time: number;
  readonly seconds: number;
  readonly reversed?: boolean;
  readonly slice?: number;
}

export const loggedEdit =
  (desk: Desk) =>
  ({ label, time, seconds, reversed, slice }: Edit): void => {
    if (Option.isNone(desk.log) || desk.quiet()) {
      return;
    }
    desk.log.value.push({
      track: EDIT,
      sample: label,
      start: time,
      duration: seconds,
      gain: ONE,
      pan: SILENT,
      offset: SILENT,
      reversed: reversed === true,
      ...fieldOf("slice")(slice),
    });
  };

const scaled = (channel: Float32Array, index: number, weight: number): void => {
  channel[index] = (channel[index] ?? SILENT) * weight;
};

export const crossfadeEdge =
  (frames: number) =>
  ({ bus, at }: Readonly<{ bus: Bus; at: number }>): void => {
    for (let offset = FIRST; offset < EDGE; offset += STEP) {
      const weight = offset / EDGE;
      if (at - ONE - offset >= FIRST) {
        scaled(bus.left, at - ONE - offset, weight);
        scaled(bus.right, at - ONE - offset, weight);
      }
      if (at + offset < frames) {
        scaled(bus.left, at + offset, weight);
        scaled(bus.right, at + offset, weight);
      }
    }
  };

export interface BusSpan {
  readonly bus: Bus;
  readonly time: number;
  readonly seconds: number;
}

const framesOf = ({ time, seconds }: BusSpan): readonly [number, number] => [
  Math.round(time * SAMPLE_RATE),
  Math.round(seconds * SAMPLE_RATE),
];

export const reverseSlice =
  (desk: Desk) =>
  (span: BusSpan): void => {
    loggedEdit(desk)({ label: "reverse", time: span.time, seconds: span.seconds, reversed: true });
    const [start, length] = framesOf(span);
    for (const channel of [span.bus.left, span.bus.right]) {
      const copy = channel.slice(start, start + length);
      for (let offset = FIRST; offset < length; offset += STEP) {
        channel[start + offset] = copy[length - ONE - offset] ?? Number.NaN;
      }
    }
    crossfadeEdge(desk.frames)({ bus: span.bus, at: start });
    crossfadeEdge(desk.frames)({ bus: span.bus, at: start + length });
  };

export interface TapeStop extends BusSpan {
  readonly endRate: number;
}

const stopped = (
  channel: Float32Array,
  [start, length]: readonly [number, number],
  endRate: number,
): void => {
  const read = readAt(channel.slice(start, start + length));
  let position = FIRST;
  for (let offset = FIRST; offset < length; offset += STEP) {
    const progress = offset / length;
    const rate = ONE + (endRate - ONE) * progress * progress;
    let fade = ONE;
    if (endRate < STOPPING) {
      fade = ONE - progress ** STOP_CURVE;
    }
    channel[start + offset] = read(position) * fade;
    position += rate;
  }
};

export const tapeStop =
  (desk: Desk) =>
  (stop: TapeStop): void => {
    loggedEdit(desk)({ label: "tape stop", time: stop.time, seconds: stop.seconds });
    for (const channel of [stop.bus.left, stop.bus.right]) {
      stopped(channel, framesOf(stop), stop.endRate);
    }
  };

export interface Repeat extends BusSpan {
  readonly count: number;
  readonly decay?: number;
  readonly pitch?: number;
}

const faded = (copy: Float32Array, length: number): void => {
  const fade = Math.min(LONGEST_FADE, Math.floor(length / FADE_SHARE));
  for (let offset = FIRST; offset < fade; offset += STEP) {
    const weight = offset / fade;
    scaled(copy, offset, weight);
    scaled(copy, length - ONE - offset, weight);
  }
};

const rateOf = (pitch: number | undefined, round: number): number => {
  if (!isGiven(pitch)) {
    return ONE;
  }
  return semitoneRatio(pitch * round);
};

const heldOf =
  (read: (position: number) => number, limit: number) =>
  (position: number, gain: number): number => {
    if (position < limit) {
      return read(position) * gain;
    }
    return SILENT;
  };

const repeated = (
  desk: Desk,
  [channel, copy]: readonly [Float32Array, Float32Array],
  [round, repeat]: readonly [number, Repeat],
): void => {
  const [start, length] = framesOf(repeat);
  const gain = orDefault(ONE)(repeat.decay) ** round;
  const rate = rateOf(repeat.pitch, round);
  const at = start + round * length;
  const held = heldOf(readAt(copy), length - ONE);
  for (let offset = FIRST; offset < length && at + offset < desk.frames; offset += STEP) {
    channel[at + offset] = held(offset * rate, gain);
  }
};

const repeatLabel = ({ count, pitch }: Repeat): string => {
  if (!isGiven(pitch)) {
    return `repeat x${String(count)}`;
  }
  return `repeat x${String(count)} pitch+${String(pitch)}`;
};

export const repeatSlice =
  (desk: Desk) =>
  (repeat: Repeat): void => {
    loggedEdit(desk)({
      label: repeatLabel(repeat),
      time: repeat.time,
      seconds: repeat.seconds * repeat.count,
      slice: repeat.seconds,
    });
    const [start, length] = framesOf(repeat);
    const copies = [
      repeat.bus.left.slice(start, start + length),
      repeat.bus.right.slice(start, start + length),
    ] as const;
    for (const copy of copies) {
      faded(copy, length);
    }
    for (let round = ONE; round < repeat.count; round += STEP) {
      repeated(desk, [repeat.bus.left, copies[FIRST]], [round, repeat]);
      repeated(desk, [repeat.bus.right, copies[ONE]], [round, repeat]);
    }
  };

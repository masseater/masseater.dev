import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";

import type { Kuraku } from "./kuraku.ts";
import type { Edit } from "./score-schema.ts";

const LOOP_FADE = 64;
const LOOP_FADE_DIVISOR = 8;
const ONE = 1;
const FIRST = 0;
const SILENT = 0;

export type Loop = Extract<Edit, Readonly<{ kind: "loop" }>>;

const framesAt = (seconds: number): number => Math.round(seconds * SAMPLE_RATE);

const faded = (copy: Float32Array, length: number): void => {
  const fade = Math.min(LOOP_FADE, Math.floor(length / LOOP_FADE_DIVISOR));
  for (let offset = FIRST; offset < fade; offset += ONE) {
    const weight = offset / fade;
    copy[offset] = (copy[offset] ?? SILENT) * weight;
    copy[length - ONE - offset] = (copy[length - ONE - offset] ?? SILENT) * weight;
  }
};

const copiesOf = (
  bus: Bus,
  from: number,
  length: number,
): readonly [Float32Array, Float32Array] => {
  const left = bus.left.slice(from, from + length);
  const right = bus.right.slice(from, from + length);
  faded(left, length);
  faded(right, length);
  return [left, right];
};

const pasted = (
  kuraku: Kuraku,
  bus: Bus,
  [[left, right], to, length]: readonly [readonly [Float32Array, Float32Array], number, number],
): void => {
  for (let offset = FIRST; offset < length && to + offset < kuraku.frames; offset += ONE) {
    bus.left[to + offset] = left[offset] ?? SILENT;
    bus.right[to + offset] = right[offset] ?? SILENT;
  }
};

export const looped =
  ({ bus, loop }: Readonly<{ bus: Bus; loop: Loop }>) =>
  (kuraku: Kuraku): void => {
    let to = framesAt(timeOf(kuraku.grid)(loop.to));
    const from = framesAt(timeOf(kuraku.grid)(loop.from));
    for (const { steps, count } of loop.parts) {
      const length = Math.round(steps * kuraku.grid.sixteenth * SAMPLE_RATE);
      const copies = copiesOf(bus, from, length);
      for (let round = FIRST; round < count; round += ONE) {
        pasted(kuraku, bus, [copies, to, length]);
        to += length;
      }
    }
  };

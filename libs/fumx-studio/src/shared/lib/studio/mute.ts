import { SAMPLE_RATE, orDefault } from "#/shared/lib/dsp/number.ts";

import { loggedEdit } from "./edits.ts";
import type { BusSpan } from "./edits.ts";
import type { Desk } from "./paste.ts";

const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const DEFAULT_FADE = 3e-3;

export interface Mute extends BusSpan {
  readonly fade?: number;
}

const weightAt = (offset: number, length: number, fade: number): number => {
  if (offset < fade) {
    return ONE - offset / fade;
  }
  if (offset > length - fade) {
    return (offset - (length - fade)) / fade;
  }
  return SILENT;
};

export const mute =
  (desk: Desk) =>
  ({ bus, time, seconds, fade }: Mute): void => {
    loggedEdit(desk)({ label: "mute", time, seconds });
    const start = Math.round(time * SAMPLE_RATE);
    const length = Math.round(seconds * SAMPLE_RATE);
    const edge = Math.round(orDefault(DEFAULT_FADE)(fade) * SAMPLE_RATE);
    for (let offset = FIRST; offset < length && start + offset < desk.frames; offset += STEP) {
      const weight = weightAt(offset, length, edge);
      bus.left[start + offset] = (bus.left[start + offset] ?? SILENT) * weight;
      bus.right[start + offset] = (bus.right[start + offset] ?? SILENT) * weight;
    }
  };

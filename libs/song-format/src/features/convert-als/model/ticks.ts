import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";

import type { From } from "#/shared/lib/from.ts";

const QUARTERS_PER_WHOLE = 4;
const TICKS_PER_BEAT = TICKS_PER_WHOLE / QUARTERS_PER_WHOLE;

export interface Tick {
  readonly tick: number;
  readonly exact: boolean;
}

export const tickOf: From<number, Tick> = (beat) => {
  const exact = beat * TICKS_PER_BEAT;
  return { tick: Math.round(exact), exact: Number.isInteger(exact) };
};

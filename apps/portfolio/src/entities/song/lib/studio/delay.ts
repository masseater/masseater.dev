import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";

import { busOf } from "./bus.ts";
import type { Bus } from "./bus.ts";

const ONE = 1;
const TWO = 2;
const SILENT = 0;
const STEP = 1;
const AT = {
  left: 0,
  right: 1,
  highLeft: 2,
  highRight: 3,
  inLeft: 4,
  inRight: 5,
  size: 6,
} as const;

export interface Echo {
  readonly seconds: number;
  readonly feedback: number;
  readonly lowPass: number;
  readonly highPass: number;
  readonly cross: number;
}

const smoothing = (hertz: number): number => ONE - Math.exp((-TWO * Math.PI * hertz) / SAMPLE_RATE);

interface Line {
  readonly from: Bus;
  readonly out: Bus;
  readonly echo: Echo;
  readonly low: number;
  readonly high: number;
  readonly state: Float64Array;
}

const fed = ({ from, out, echo, state }: Line, earlier: number): void => {
  const { feedback, cross } = echo;
  const outLeft = out.left[earlier] ?? SILENT;
  const outRight = out.right[earlier] ?? SILENT;
  state[AT.inLeft] =
    (from.left[earlier] ?? SILENT) +
    outRight * feedback * cross +
    outLeft * feedback * (ONE - cross);
  state[AT.inRight] =
    (from.right[earlier] ?? SILENT) +
    outLeft * feedback * cross +
    outRight * feedback * (ONE - cross);
};

const lowPassed = ({ state, low }: Line): void => {
  const left = state[AT.left] ?? SILENT;
  const right = state[AT.right] ?? SILENT;
  state[AT.left] = left + low * ((state[AT.inLeft] ?? SILENT) - left);
  state[AT.right] = right + low * ((state[AT.inRight] ?? SILENT) - right);
};

const highPassed = ({ state, high, out }: Line, index: number): void => {
  const left = state[AT.left] ?? SILENT;
  const right = state[AT.right] ?? SILENT;
  const highLeft = (state[AT.highLeft] ?? SILENT) + high * (left - (state[AT.highLeft] ?? SILENT));
  const highRight =
    (state[AT.highRight] ?? SILENT) + high * (right - (state[AT.highRight] ?? SILENT));
  state[AT.highLeft] = highLeft;
  state[AT.highRight] = highRight;
  out.left[index] = left - highLeft;
  out.right[index] = right - highRight;
};

export const delayed =
  (frames: number) =>
  (echo: Echo) =>
  (from: Bus): Bus => {
    const out = busOf(frames)({});
    const samples = Math.round(echo.seconds * SAMPLE_RATE);
    const line = {
      from,
      out,
      echo,
      low: smoothing(echo.lowPass),
      high: smoothing(echo.highPass),
      state: new Float64Array(AT.size),
    };
    for (let index = samples; index < frames; index += STEP) {
      fed(line, index - samples);
      lowPassed(line);
      highPassed(line, index);
    }
    return out;
  };

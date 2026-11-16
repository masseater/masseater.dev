import { Option, pipe } from "effect";

import { convolvePair } from "#/entities/song/lib/dsp/convolve-pair.ts";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { onePole } from "#/entities/song/lib/studio/dynamics.ts";
import { sent } from "#/entities/song/lib/studio/send.ts";

import type { Kuraku } from "./kuraku.ts";
import { MIX } from "./score.ts";

const ECHO_SIXTEENTHS = 3;
const FEEDBACK = 0.5;
const CROSS = 0.85;
const ECHO = { low: 380, high: 3800 } as const;
const DENORMAL = 1e-9;
const ECHO_TO_PLATE = 0.3;
const ECHO_DUCK = 0.3;
const PRE_DELAY = 0.02;
const PLATE_GAIN = 0.01;
const PLATE_MIX = { dry: 0.6, ducked: 0.4 } as const;
const ONE = 1;
const SILENT = 0;
const FIRST = 0;

const STATE = { left: 0, right: 1, leftLow: 2, rightLow: 3, size: 4 } as const;
const POLES = { low: onePole(ECHO.high), high: onePole(ECHO.low) } as const;

const heard = (channel: Float32Array): boolean => channel.some((value) => value !== SILENT);

const settled = (value: number): number => {
  if (Math.abs(value) < DENORMAL) {
    return SILENT;
  }
  return value;
};

const smoothed = (
  state: Float64Array,
  slot: number,
  [pole, target]: readonly [number, number],
): number => {
  const current = state[slot] ?? SILENT;
  const next = current + pole * (target - current);
  state[slot] = next;
  return next;
};

const echoAt = (
  out: Bus,
  state: Float64Array,
  [index, delay, input]: readonly [number, number, Float32Array],
): void => {
  const inLeft = (input[index - delay] ?? SILENT) + (out.right[index - delay] ?? SILENT) * FEEDBACK;
  const inRight = (out.left[index - delay] ?? SILENT) * CROSS;
  const left = smoothed(state, STATE.left, [POLES.low, inLeft]);
  const right = smoothed(state, STATE.right, [POLES.low, inRight]);
  out.left[index] = settled(left - smoothed(state, STATE.leftLow, [POLES.high, left]));
  out.right[index] = settled(right - smoothed(state, STATE.rightLow, [POLES.high, right]));
};

const echoesOf = (kuraku: Kuraku, input: Float32Array): Bus => {
  const out = kuraku.studio.bus({});
  const delay = Math.round(kuraku.grid.sixteenth * ECHO_SIXTEENTHS * SAMPLE_RATE);
  const state = new Float64Array(STATE.size);
  for (let index = delay; index < kuraku.frames; index += ONE) {
    echoAt(out, state, [index, delay, input]);
  }
  return out;
};

export interface Echo {
  readonly main: Bus;
  readonly delay: Option.Option<Bus>;
  readonly plate: Option.Option<Bus>;
}

const echoSent = (kuraku: Kuraku, main: Bus, [delay, plate]: readonly [Bus, Bus]): void => {
  const out = echoesOf(kuraku, delay.left);
  sent(kuraku.frames)({ into: plate, gain: ECHO_TO_PLATE, shape: Option.none() })(out);
  kuraku.studio.envelope({ envelope: kuraku.shared().hits, depth: ECHO_DUCK })(out);
  kuraku.studio.mix({ into: main, gain: MIX.returns.delay })(out);
};

export const echoed =
  ({ main, delay, plate }: Echo) =>
  (kuraku: Kuraku): Option.Option<Bus> => {
    const sending = pipe(
      delay,
      Option.filter((bus) => heard(bus.left)),
    );
    if (Option.isNone(sending)) {
      return plate;
    }
    const into = Option.getOrElse(plate, () => kuraku.studio.bus({ mono: true }));
    echoSent(kuraku, main, [sending.value, into]);
    return Option.some(into);
  };

const spanOf = (channel: Float32Array): readonly [number, number] => {
  let start = FIRST;
  let end = channel.length;
  while (start < channel.length && channel[start] === SILENT) {
    start += ONE;
  }
  while (end > start && channel[end - ONE] === SILENT) {
    end -= ONE;
  }
  return [start, end];
};

const PLATE_LEVELS = {
  dry: PLATE_MIX.dry * MIX.returns.reverb,
  ducked: PLATE_MIX.ducked * MIX.returns.reverb,
} as const;

const wetAdded = (
  main: Bus,
  wet: Readonly<{ left: Float32Array; right: Float32Array }>,
  [at, frames, hits]: readonly [number, number, Float32Array],
): void => {
  for (let index = FIRST; index < frames; index += ONE) {
    const gain = PLATE_LEVELS.dry + PLATE_LEVELS.ducked * (hits[at + index] ?? SILENT);
    main.left[at + index] = (main.left[at + index] ?? SILENT) + (wet.left[index] ?? SILENT) * gain;
    main.right[at + index] =
      (main.right[at + index] ?? SILENT) + (wet.right[index] ?? SILENT) * gain;
  }
};

export interface Plating {
  readonly main: Bus;
  readonly plate: Option.Option<Bus>;
}

export const plated =
  ({ main, plate }: Plating) =>
  (kuraku: Kuraku): void => {
    const send = pipe(
      plate,
      Option.filter((bus) => heard(bus.left)),
    );
    if (Option.isNone(send)) {
      return;
    }
    const shared = kuraku.shared();
    const [start, end] = spanOf(send.value.left);
    const input = send.value.left.slice(start, end);
    const at = start + Math.round(PRE_DELAY * SAMPLE_RATE);
    const frames = Math.min(input.length + shared.plate.left.length - ONE, kuraku.frames - at);
    const wet = convolvePair({ impulse: shared.plate, gain: PLATE_GAIN, frames })(input);
    wetAdded(main, wet, [at, frames, shared.hits]);
  };

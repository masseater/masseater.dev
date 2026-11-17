import { Array as Arr, Option, Predicate, Schema } from "effect";

import { SAMPLE_RATE, isGiven, orDefault, semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import { readAt } from "#/entities/song/lib/dsp/sampling.ts";
import { curve } from "#/entities/song/lib/dsp/shape.ts";
import constants from "#/entities/song/lib/dsp/tuning.json";

import type { Bus } from "./bus.ts";
import type { Label, Ledger, Placement, SampleInfo, Sweep } from "./placement.ts";

const CONTROL_RATE = 16;
const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const QUARTER_TURN = 4;
const SPARE = 2;
const DEFAULT_ATTACK = 8e-4;
const DEFAULT_RELEASE = 4e-3;

export interface Desk {
  readonly frames: number;
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleInfo>>;
  readonly labelOf: (sample: Float32Array) => Label;
  readonly log: Option.Option<Ledger>;
  readonly quiet: () => boolean;
}

export type Source = string | Float32Array;

export interface Paste {
  readonly bus: Bus;
  readonly source: Source;
  readonly time: number;
  readonly placement?: Placement;
}

export interface Plan {
  readonly x: Float32Array;
  readonly placement: Placement;
  readonly gain: number;
  readonly pan: number;
  readonly left: number;
  readonly right: number;
  readonly base: number;
  readonly start: number;
  readonly length: number;
  readonly attack: number;
  readonly release: number;
}

const taggedError = Schema.TaggedError;

export class MissingSample extends taggedError<MissingSample, { readonly brand: unique symbol }>()(
  "MissingSample",
  { sample: Schema.String },
) {}

const sourceOf = (desk: Desk, source: Source): Float32Array => {
  if (typeof source !== "string") {
    return source;
  }
  return Option.getOrThrowWith(Option.fromUndefinedOr(desk.samples[source]), () =>
    MissingSample.make({ sample: source }),
  );
};

const baseRate = ({ rate, semitones }: Placement): number => {
  if (isGiven(rate)) {
    return rate;
  }
  if (isGiven(semitones)) {
    return semitoneRatio(semitones);
  }
  return ONE;
};

const lengthOf = (x: Float32Array, placement: Placement, base: number): number => {
  if (Predicate.isNotUndefined(placement.duration)) {
    return Math.round(placement.duration * SAMPLE_RATE);
  }
  const offset = orDefault(SILENT)(placement.offset) * SAMPLE_RATE;
  return Math.ceil((x.length - offset) / base) + SPARE;
};

const framesOf = (seconds: number): number => Math.max(ONE, Math.round(seconds * SAMPLE_RATE));

export const planOf =
  (desk: Desk) =>
  ({ source, time, placement = {} }: Paste): Option.Option<Plan> => {
    const x = sourceOf(desk, source);
    const gain = placement.gain ?? ONE;
    const pan = orDefault(SILENT)(placement.pan);
    const angle = ((pan + ONE) * Math.PI) / QUARTER_TURN;
    const base = baseRate(placement);
    const start = Math.round(time * SAMPLE_RATE);
    const length = Math.min(lengthOf(x, placement, base), desk.frames - start);
    return Option.liftPredicate(
      {
        x,
        placement,
        gain,
        pan,
        left: gain * Math.cos(angle) * constants.panLaw,
        right: gain * Math.sin(angle) * constants.panLaw,
        base,
        start,
        length,
        attack: framesOf(placement.attack ?? DEFAULT_ATTACK),
        release: framesOf(placement.release ?? DEFAULT_RELEASE),
      },
      () => start < desk.frames && length > SILENT,
    );
  };

const firstPosition = ({ x, placement }: Plan): number => {
  const { reverse } = placement;
  if (Predicate.isUndefined(reverse)) {
    return orDefault(SILENT)(placement.offset) * SAMPLE_RATE;
  }
  if (Predicate.isNotUndefined(reverse.from)) {
    return reverse.from * SAMPLE_RATE;
  }
  return x.length - ONE;
};

const shaped = (plan: Plan, frame: number): number => {
  let envelope = ONE;
  if (frame < plan.attack) {
    envelope = frame / plan.attack;
  }
  const remaining = plan.length - frame;
  if (remaining < plan.release) {
    envelope *= remaining / plan.release;
  }
  return envelope;
};

const decayOf = ({ decay }: Placement): number => {
  if (!isGiven(decay)) {
    return ONE;
  }
  return Math.exp(-ONE / (decay * SAMPLE_RATE));
};

const glideOf = (plan: Plan): ((frame: number, rate: number) => number) => {
  const { pitch } = plan.placement;
  if (Predicate.isUndefined(pitch)) {
    return (_frame, rate) => rate;
  }
  const bend = curve(pitch);
  return (frame, rate) => {
    if (frame % CONTROL_RATE === SILENT) {
      return plan.base * semitoneRatio(bend(frame / SAMPLE_RATE));
    }
    return rate;
  };
};

const directionOf = ({ reverse }: Placement): number => {
  if (Predicate.isNotUndefined(reverse)) {
    return -ONE;
  }
  return ONE;
};

const voiceOf = (plan: Plan): ((frame: number) => number) => {
  const read = readAt(plan.x);
  const glide = glideOf(plan);
  const direction = directionOf(plan.placement);
  const fall = decayOf(plan.placement);
  const fading = orDefault(SILENT)(plan.placement.decay) !== SILENT;
  const last = plan.x.length - ONE;
  let position = firstPosition(plan);
  let rate = plan.base;
  let held = ONE;
  return (frame) => {
    rate = glide(frame, rate);
    if (position < FIRST || position > last) {
      return Number.NaN;
    }
    const value = read(position);
    position += direction * rate;
    let envelope = shaped(plan, frame);
    if (fading) {
      envelope *= held;
      held *= fall;
    }
    return value * envelope;
  };
};

export type Writer = (frame: number, value: number) => void;

export interface Target {
  readonly bus: Bus;
  readonly plan: Plan;
  readonly scratch: Option.Option<Float32Array>;
}

export const writerOf = ({ bus, plan, scratch }: Target): Writer => {
  if (Option.isSome(scratch)) {
    return (frame, value) => {
      scratch.value[frame] = value;
    };
  }
  if (bus.mono) {
    return (frame, value) => {
      bus.left[plan.start + frame] = (bus.left[plan.start + frame] ?? SILENT) + value * plan.gain;
    };
  }
  return (frame, value) => {
    bus.left[plan.start + frame] = (bus.left[plan.start + frame] ?? SILENT) + value * plan.left;
    bus.right[plan.start + frame] = (bus.right[plan.start + frame] ?? SILENT) + value * plan.right;
  };
};

export const isLowPassed = (lowPass?: number | Sweep): lowPass is number | Sweep => {
  if (Predicate.isNumber(lowPass)) {
    return isGiven(lowPass);
  }
  return Predicate.isNotUndefined(lowPass);
};

export const needsScratch = ({ lowPass, highPass, drive: driven }: Placement): boolean =>
  isLowPassed(lowPass) || Arr.some([highPass, driven], isGiven);

export const played =
  (plan: Plan) =>
  (write: Writer): number => {
    const voice = voiceOf(plan);
    let frame = FIRST;
    for (; frame < plan.length; frame += STEP) {
      const value = voice(frame);
      if (Number.isNaN(value)) {
        return frame;
      }
      write(frame, value);
    }
    return frame;
  };

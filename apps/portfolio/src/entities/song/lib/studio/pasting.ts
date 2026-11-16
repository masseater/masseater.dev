import { Option, Predicate } from "effect";

import { SVF, svf } from "#/entities/song/lib/dsp/filter.ts";
import { SAMPLE_RATE, isGiven, orDefault } from "#/entities/song/lib/dsp/number.ts";
import { drive } from "#/entities/song/lib/dsp/shape.ts";
import constants from "#/entities/song/lib/dsp/tuning.json";

import type { Bus } from "./bus.ts";
import { fieldOf } from "./field.ts";
import { needsScratch, planOf, played, writerOf } from "./paste.ts";
import type { Desk, Paste, Plan } from "./paste.ts";
import type { Logged } from "./placement.ts";

const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const TAIL = 64;
const OCTAVE = 12;
const UNKNOWN = "?";

const keyOf = (desk: Desk, plan: Plan, name: string): number | undefined => {
  const info = desk.table[name] ?? {};
  return plan.placement.midi ?? desk.labelOf(plan.x).midi ?? info.key ?? info.midi;
};

const pitchOf = (key: number | undefined, base: number): Readonly<{ pitch?: number }> => {
  if (Predicate.isUndefined(key)) {
    return {};
  }
  return { pitch: key + OCTAVE * Math.log2(base) };
};

interface Played {
  readonly track: string;
  readonly plan: Plan;
  readonly frames: number;
}

const entryOf =
  (desk: Desk) =>
  ({ track, plan, frames }: Played): Logged => {
    const sample = desk.labelOf(plan.x).name ?? UNKNOWN;
    const { placement } = plan;
    return {
      track,
      sample,
      start: plan.start / SAMPLE_RATE,
      duration: frames / SAMPLE_RATE,
      ...pitchOf(keyOf(desk, plan, sample), plan.base),
      gain: plan.gain,
      pan: plan.pan,
      offset: orDefault(SILENT)(placement.offset),
      ...fieldOf("glide")(placement.pitch),
      reversed: placement.reverse === true,
    };
  };

const lowPassed = (scratch: Float32Array, plan: Plan, frames: number): void => {
  const { lowPass, lowPassEnd } = plan.placement;
  const resonance = fieldOf("resonance")(plan.placement.resonance);
  if (!isGiven(lowPass)) {
    return;
  }
  if (isGiven(lowPassEnd)) {
    const ratio = lowPassEnd / lowPass;
    svf({
      kind: SVF.low,
      cutoff: (index) => lowPass * ratio ** (index / frames),
      ...resonance,
      from: FIRST,
      to: frames,
    })(scratch);
    return;
  }
  svf({ kind: SVF.low, cutoff: lowPass, ...resonance, from: FIRST, to: frames })(scratch);
};

const finished = (scratch: Float32Array, plan: Plan, frames: number): void => {
  const { highPass, drive: driven } = plan.placement;
  if (isGiven(highPass)) {
    svf({
      kind: SVF.high,
      cutoff: highPass,
      resonance: constants.defaultResonance,
      from: FIRST,
      to: frames,
    })(scratch);
  }
  lowPassed(scratch, plan, frames);
  if (isGiven(driven)) {
    drive({ pre: driven, post: ONE / Math.tanh(driven), from: FIRST, to: frames })(scratch);
  }
  const tail = Math.min(frames, TAIL);
  for (let index = FIRST; index < tail; index += STEP) {
    scratch[frames - ONE - index] = (scratch[frames - ONE - index] ?? SILENT) * (index / tail);
  }
};

const mixedIn = (
  bus: Bus,
  plan: Plan,
  [scratch, frames]: readonly [Float32Array, number],
): void => {
  for (let index = FIRST; index < frames; index += STEP) {
    const value = scratch[index] ?? SILENT;
    const at = plan.start + index;
    if (bus.mono) {
      bus.left[at] = (bus.left[at] ?? SILENT) + value * plan.gain;
    } else {
      bus.left[at] = (bus.left[at] ?? SILENT) + value * plan.left;
      bus.right[at] = (bus.right[at] ?? SILENT) + value * plan.right;
    }
  }
};

const scratchFor = (plan: Plan): Option.Option<Float32Array> => {
  if (needsScratch(plan.placement)) {
    return Option.some(new Float32Array(plan.length));
  }
  return Option.none();
};

const logged = (desk: Desk, bus: Bus, [plan, frames]: readonly [Plan, number]): void => {
  const track = bus.name ?? "";
  if (Option.isSome(desk.log) && track !== "") {
    desk.log.value.push(entryOf(desk)({ track, plan, frames }));
  }
};

export const pasteOn =
  (desk: Desk) =>
  (paste: Paste): void => {
    const planned = planOf(desk)(paste);
    if (Option.isNone(planned)) {
      return;
    }
    const plan = planned.value;
    const scratch = scratchFor(plan);
    const frames = played(plan)(writerOf({ bus: paste.bus, plan, scratch }));
    logged(desk, paste.bus, [plan, frames]);
    if (Option.isSome(scratch)) {
      finished(scratch.value, plan, frames);
      mixedIn(paste.bus, plan, [scratch.value, frames]);
    }
  };

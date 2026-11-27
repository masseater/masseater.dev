import type { Effect as SongEffect } from "@r_masseater/song-format";
import type { Option } from "effect";

import { SVF, svf } from "#/shared/lib/dsp/filter.ts";
import type { SvfKind } from "#/shared/lib/dsp/filter.ts";
import { decibels } from "#/shared/lib/dsp/number.ts";
import { drive } from "#/shared/lib/dsp/shape.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import { curveApplied } from "#/shared/lib/studio/curves.ts";

import { done, optional } from "./played.ts";
import type { Played } from "./played.ts";
import { eachChannel, scaled } from "./rack.ts";
import type { Rack } from "./rack.ts";
import { EVERY, compCurve, limitCurveOf } from "./stages.ts";

const ONE = 1;

export interface CutoffEffect {
  readonly hertz: number;
  readonly resonance: Option.Option<number>;
}

const filtered =
  (bus: Bus) =>
  (kind: SvfKind) =>
  ({ hertz, resonance }: CutoffEffect): Played =>
    done(() => {
      eachChannel(bus)(svf({ kind, cutoff: hertz, ...optional("resonance")(resonance) }));
    });

export const highPassed = (bus: Bus): ((cutoff: CutoffEffect) => Played) => filtered(bus)(SVF.high);

export const lowPassed = (bus: Bus): ((cutoff: CutoffEffect) => Played) => filtered(bus)(SVF.low);

export const gained =
  (bus: Bus) =>
  (effect: Extract<SongEffect, { kind: "gain" }>): Played =>
    done(() => {
      eachChannel(bus)(scaled(decibels(effect.decibels)));
    });

export const driven =
  (bus: Bus) =>
  ({ amount }: Extract<SongEffect, { kind: "drive" }>): Played =>
    done(() => {
      eachChannel(bus)(drive({ pre: amount, post: ONE / Math.tanh(amount) }));
    });

const curved =
  (rack: Rack) =>
  (bus: Bus) =>
  (curve: Float32Array): Played =>
    done(() => {
      curveApplied(rack.frames)({ curve, every: EVERY })(bus);
    });

export const compressed =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: Extract<SongEffect, { kind: "comp" }>): Played =>
    curved(rack)(bus)(compCurve(rack.frames)(bus)(effect));

export const limited =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: Extract<SongEffect, { kind: "limit" }>): Played =>
    curved(rack)(bus)(limitCurveOf(bus)(effect));

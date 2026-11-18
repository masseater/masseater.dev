import type { Effect as SongEffect } from "@r_masseater/fumx-parser";
import { Effect, Option } from "effect";

import { decibels } from "#/shared/lib/dsp/number.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import { compressionCurve, heldCurve } from "#/shared/lib/studio/dynamics.ts";
import { limitCurve } from "#/shared/lib/studio/limiter.ts";

import { Unplayable } from "./unplayable.ts";

export const EVERY = 64;
const NONE = 0;
const DEFAULT_ATTACK_MS = 10;
const DEFAULT_RELEASE_MS = 120;
const DEFAULT_LOOKAHEAD_MS = 5;
const DEFAULT_LIMIT_RELEASE_MS = 80;

export type Curve = Float32Array<ArrayBuffer>;

type Comp = Extract<SongEffect, { kind: "comp" }>;

type Limit = Extract<SongEffect, { kind: "limit" }>;

export const compCurve =
  (frames: number) =>
  (bus: Bus) =>
  (effect: Comp): Curve =>
    compressionCurve(frames)({
      every: EVERY,
      threshold: effect.thresholdDecibels,
      ratio: effect.ratio,
      attack: Option.getOrElse(effect.attackMilliseconds, () => DEFAULT_ATTACK_MS),
      release: Option.getOrElse(effect.releaseMilliseconds, () => DEFAULT_RELEASE_MS),
      makeup: Option.getOrElse(effect.makeupDecibels, () => NONE),
    })(bus).curve;

export const limitCurveOf =
  (bus: Bus) =>
  (effect: Limit): Curve =>
    limitCurve({
      ceiling: effect.ceilingDecibels,
      lookahead: Option.getOrElse(effect.lookaheadMilliseconds, () => DEFAULT_LOOKAHEAD_MS),
      release: Option.getOrElse(effect.releaseMilliseconds, () => DEFAULT_LIMIT_RELEASE_MS),
      every: EVERY,
      truePeak: true,
    })(bus).curve;

export const stageOf =
  (frames: number) =>
  (bus: Bus) =>
  (effect: SongEffect): Effect.Effect<Curve, Unplayable> => {
    if (effect.kind === "gain") {
      return Effect.succeed(heldCurve(frames)({ every: EVERY, level: decibels(effect.decibels) }));
    }
    if (effect.kind === "comp") {
      return Effect.succeed(compCurve(frames)(bus)(effect));
    }
    if (effect.kind === "limit") {
      return Effect.succeed(limitCurveOf(bus)(effect));
    }
    return Effect.fail(Unplayable.make({ part: `master ${effect.kind}` }));
  };

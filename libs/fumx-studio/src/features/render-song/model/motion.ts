import { Option } from "effect";

import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import { chorus } from "#/shared/lib/studio/chorus.ts";
import { widen } from "#/shared/lib/studio/dynamics.ts";
import { phaser, tremolo } from "#/shared/lib/studio/modulation.ts";

import type { EffectOf } from "./effect-kinds.ts";
import { done, optional } from "./played.ts";
import type { Played } from "./played.ts";
import type { Rack } from "./rack.ts";

const NONE = 0;
const HALF = 0.5;
const DEFAULT_PHASER_FEEDBACK = 0.4;

export const widened =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"width">): Played =>
    done(() => {
      widen(rack.frames)({ width: effect.amount, ...optional("monoBelow")(effect.monoBelowHertz) })(
        bus,
      );
    });

export const chorused =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"chorus">): Played =>
    done(() => {
      chorus(rack.frames)({
        depth: effect.depthMilliseconds,
        rate: effect.rateHertz,
        amount: effect.mix,
        ...optional("base")(effect.baseMilliseconds),
      })(bus);
    });

export const trembled =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"tremolo">): Played =>
    done(() => {
      tremolo(rack.frames)({ rate: effect.rateHertz, depth: effect.depth })(bus);
    });

export const phased =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"phaser">): Played =>
    done(() => {
      phaser(rack.frames)({
        rate: effect.rateHertz,
        low: effect.lowHertz,
        high: effect.highHertz,
        feedback: Option.getOrElse(effect.feedback, () => DEFAULT_PHASER_FEEDBACK),
        amount: Option.getOrElse(effect.mix, () => HALF),
        from: NONE,
        to: rack.frames / SAMPLE_RATE,
      })(bus);
    });

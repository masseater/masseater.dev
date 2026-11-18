import { Effect, Match, Option, pipe } from "effect";

import { convolvePair } from "#/shared/lib/dsp/convolve-pair.ts";
import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import { delayed } from "#/shared/lib/studio/delay.ts";

import type { EffectOf } from "./effect-kinds.ts";
import { blended } from "./rack.ts";
import type { Rack } from "./rack.ts";
import { Unplayable } from "./unplayable.ts";

const MILLI = 1e-3;
const NONE = 0;
const ONE = 1;
const HALF = 0.5;
const DEFAULT_DELAY_LOW_HZ = 6000;
const DEFAULT_DELAY_HIGH_HZ = 120;

const impulseOf =
  (rack: Rack) =>
  (path: string): Effect.Effect<Float32Array, Unplayable> =>
    Effect.fromOption(Option.fromUndefinedOr(rack.samples[path])).pipe(
      Effect.mapError(() => Unplayable.make({ part: `impulse ${path}` })),
    );

const predelayed =
  (rack: Rack) =>
  (bus: Bus) =>
  (milliseconds: number): Float32Array => {
    const offset = Math.round(milliseconds * MILLI * SAMPLE_RATE);
    const input = new Float32Array(rack.frames);
    for (let index = NONE; index + offset < rack.frames; index += ONE) {
      input[index + offset] = ((bus.left[index] ?? NONE) + (bus.right[index] ?? NONE)) * HALF;
    }
    return input;
  };

export const reverbed =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"reverb">): Effect.Effect<void, Unplayable> =>
    Effect.gen(function* reverb() {
      const left = yield* impulseOf(rack)(effect.left);
      const right = yield* pipe(
        effect.right,
        Option.match({ onNone: () => Effect.succeed(left), onSome: impulseOf(rack) }),
      );
      const input = predelayed(rack)(bus)(
        Option.getOrElse(effect.predelayMilliseconds, () => NONE),
      );
      const wet = convolvePair({ impulse: { left, right }, gain: ONE, frames: rack.frames })(input);
      blended(bus)({ wet: { ...wet, mono: false }, mix: Option.getOrElse(effect.mix, () => ONE) });
    });

const delaySeconds =
  (rack: Rack) =>
  (time: EffectOf<"delay">["time"]): number =>
    Match.value(time).pipe(
      Match.discriminatorsExhaustive("kind")({
        milliseconds: ({ milliseconds }) => milliseconds * MILLI,
        ticks: ({ ticks }) => rack.clock.secondsAt(ticks) - rack.clock.secondsAt(NONE),
      }),
    );

export const echoed =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: EffectOf<"delay">): void => {
    const wet = delayed(rack.frames)({
      seconds: delaySeconds(rack)(effect.time),
      feedback: effect.feedback,
      lowPass: Option.getOrElse(effect.lowpassHertz, () => DEFAULT_DELAY_LOW_HZ),
      highPass: Option.getOrElse(effect.highpassHertz, () => DEFAULT_DELAY_HIGH_HZ),
      cross: Option.getOrElse(effect.pingpong, () => NONE),
    })(bus);
    for (let index = NONE; index < rack.frames; index += ONE) {
      bus.left[index] = (bus.left[index] ?? NONE) + (wet.left[index] ?? NONE);
      bus.right[index] = (bus.right[index] ?? NONE) + (wet.right[index] ?? NONE);
    }
  };

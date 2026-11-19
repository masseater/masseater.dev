import type { Song } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

import { breathe } from "#/shared/lib/studio/breathe.ts";
import { busOf } from "#/shared/lib/studio/bus.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";

import type { Context } from "./context.ts";
import { effectApplied } from "./effects.ts";
import { sentOut } from "./mixdown.ts";
import type { Stem } from "./mixdown.ts";
import { played } from "./playing.ts";
import type { Unplayable } from "./unplayable.ts";

const chained =
  (context: Context) =>
  (bus: Bus) =>
  (fx: Song["master"]): Effect.Effect<void, Unplayable> =>
    Effect.forEach(fx, effectApplied(context)(bus), { discard: true, concurrency: 1 });

export const trackStem =
  (context: Context) =>
  (track: Song["tracks"][number]): Effect.Effect<Stem, Unplayable> =>
    Effect.gen(function* trackRendered() {
      yield* breathe;
      const { bus, events } = yield* played(context)(track);
      yield* chained(context)(bus)(track.fx);
      sentOut(context.frames)(context.buses)(bus)(track);
      return { name: track.name, bus, events, mixer: track.mixer };
    });

export const busStem =
  (context: Context) =>
  (declared: Song["buses"][number]): Effect.Effect<Stem, Unplayable> =>
    Effect.gen(function* busRendered() {
      yield* breathe;
      const bus =
        context.buses.get(declared.name) ?? busOf(context.frames)({ name: declared.name });
      yield* chained(context)(bus)(declared.fx);
      sentOut(context.frames)(context.buses)(bus)(declared);
      return { name: declared.name, bus, events: [], mixer: declared.mixer };
    });

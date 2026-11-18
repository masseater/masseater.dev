import type { Song } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

import { busOf } from "#/shared/lib/studio/bus.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Logged } from "#/shared/lib/studio/placement.ts";

import type { Context } from "./context.ts";
import { deskOf, loggedWithSends, pasted } from "./desk.ts";
import { hitsPlaced, notesPlaced } from "./placements.ts";

export const played =
  (context: Context) =>
  (track: Song["tracks"][number]): Effect.Effect<Bus> =>
    Effect.sync(() => {
      const bus = busOf(context.frames)({ name: track.name });
      const held: Logged[] = [];
      const desk = deskOf(context.frames)(context.samples)({
        push: (...entries) => held.push(...entries),
      });
      const play = pasted(desk)(context.buses)(bus);
      for (const placed of [...notesPlaced(context)(track), ...hitsPlaced(context)(track)]) {
        play(placed);
      }
      loggedWithSends(context.session.log)(held)(track.sends);
      return bus;
    });

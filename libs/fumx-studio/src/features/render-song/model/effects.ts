import type { Effect as SongEffect } from "@r_masseater/fumx-parser";
import { Effect, Match } from "effect";

import type { Bus } from "#/shared/lib/studio/bus.ts";

import { chorused, phased, trembled, widened } from "./motion.ts";
import { done } from "./played.ts";
import type { Played } from "./played.ts";
import type { Rack } from "./rack.ts";
import { echoed, reverbed } from "./space.ts";
import { compressed, driven, gained, highPassed, limited, lowPassed } from "./tone.ts";
import { Unplayable } from "./unplayable.ts";

export const effectApplied =
  (rack: Rack) =>
  (bus: Bus) =>
  (effect: SongEffect): Played =>
    Match.value(effect).pipe(
      Match.discriminatorsExhaustive("kind")({
        highpass: highPassed(bus),
        lowpass: lowPassed(bus),
        gain: gained(bus),
        drive: driven(bus),
        comp: compressed(rack)(bus),
        limit: limited(rack)(bus),
        width: widened(rack)(bus),
        chorus: chorused(rack)(bus),
        tremolo: trembled(rack)(bus),
        phaser: phased(rack)(bus),
        delay: (given) =>
          done(() => {
            echoed(rack)(bus)(given);
          }),
        reverb: reverbed(rack)(bus),
        plugin: (given) => Effect.fail(Unplayable.make({ part: `plugin ${given.plugin}` })),
      }),
    );

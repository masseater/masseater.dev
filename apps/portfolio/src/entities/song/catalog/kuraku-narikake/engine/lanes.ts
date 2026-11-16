import { Option } from "effect";

import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { secondsOf, timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { Placement } from "#/entities/song/lib/studio/placement.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

import type { Kuraku } from "./kuraku.ts";
import type { Clip } from "./score-schema.ts";

const placementOf =
  (grid: Grid) =>
  ({ lane: _lane, sample: _sample, at: _at, length, ...placement }: Clip): Placement =>
    Option.match(Option.fromUndefinedOr(length), {
      onNone: () => placement,
      onSome: (span) => ({ ...placement, duration: secondsOf(grid)(span) }),
    });

export const pastedInto =
  (kuraku: Kuraku) =>
  ({ bus, lane }: Readonly<{ bus: Bus; lane: string }>): Bus => {
    for (const clip of kuraku.lanes[lane] ?? []) {
      kuraku.studio.paste({
        bus,
        source: clip.sample,
        time: timeOf(kuraku.grid)(clip.at),
        placement: placementOf(kuraku.grid)(clip),
      });
    }
    return bus;
  };

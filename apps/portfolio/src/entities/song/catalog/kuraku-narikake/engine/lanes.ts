import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { secondsOf, timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import type { Placement } from "@masseater.dev/fumx-studio/studio/placement";
import type { Grid } from "@masseater.dev/fumx-studio/studio/timing";
import { Option } from "effect";

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

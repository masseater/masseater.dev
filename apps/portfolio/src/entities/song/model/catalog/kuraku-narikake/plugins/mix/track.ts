import { packed } from "@masseater.dev/fumx-studio/studio/stem";
import type { Stem } from "@masseater.dev/fumx-studio/studio/stem";
import { Array as Arr, Option, Schema, pipe } from "effect";

import { chained } from "./chain.ts";
import { cutsApplied } from "./cut-ups.ts";
import type { Kuraku } from "./kuraku.ts";
import { museumAdded } from "./museum.ts";
import { echoed, plated } from "./returns.ts";
import type { Track } from "./score-schema.ts";
import { MIX } from "./score.ts";

const taggedError = Schema.TaggedError;

class UnknownTrack extends taggedError<UnknownTrack, { readonly brand: unique symbol }>()(
  "UnknownTrack",
  { track: Schema.String },
) {}

export interface TrackStem extends Stem {
  readonly name: string;
  readonly drum: boolean;
}

const trackNamed = (name: string): Track =>
  Option.getOrThrowWith(
    pipe(
      MIX.tracks,
      Arr.findFirst((each) => each.name === name),
    ),
    () => UnknownTrack.make({ track: name }),
  );

export const trackOf =
  (kuraku: Kuraku) =>
  (name: string): TrackStem => {
    const track = trackNamed(name);
    kuraku.shared();
    const { find, at } = chained(kuraku)(track);
    const main = at("main");
    const drum = track.drum === true;
    const plate = echoed({ main, delay: find("delay"), plate: find("plate") })(kuraku);
    plated({ main, plate })(kuraku);
    cutsApplied({ bus: main, drum })(kuraku);
    museumAdded({ main, museum: find("museum"), direct: find("direct") })(kuraku);
    return { ...packed(main), name, drum };
  };

import { breathe } from "@masseater.dev/fumx-studio/studio/breathe";
import { unpacked } from "@masseater.dev/fumx-studio/studio/stem";
import { Effect, String as Str } from "effect";

import type { Held } from "./deck.ts";
import type { Kuraku } from "./kuraku.ts";
import { MIX } from "./score.ts";
import { trackOf } from "./track.ts";

const TRACK_SHARE = 0.84;
const ONE = 1;

export interface Tracking {
  readonly kuraku: Kuraku;
  readonly held: Held;
  readonly progress: (share: number, label: string) => void;
}

export const renderTracks = (tracking: Tracking): Effect.Effect<void> =>
  Effect.forEach(
    MIX.tracks,
    ({ name }, index) =>
      Effect.andThen(
        breathe,
        Effect.sync(() => {
          const stem = trackOf(tracking.kuraku)(name);
          const { left, right } = unpacked(stem);
          tracking.held.deck.write(tracking.held.slotOf(stem.name, stem.drum), left, right);
          tracking.progress(
            ((index + ONE) / MIX.tracks.length) * TRACK_SHARE,
            Str.toLowerCase(name),
          );
        }),
      ),
    { concurrency: 1, discard: true },
  );

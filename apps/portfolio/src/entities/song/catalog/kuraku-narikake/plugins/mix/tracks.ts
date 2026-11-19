import type { MixRequest } from "@masseater.dev/fumx-studio/plugin/plugin";
import { unpacked } from "@masseater.dev/fumx-studio/studio/stem";
import type { Stem } from "@masseater.dev/fumx-studio/studio/stem";
import { Array as Arr, String as Str, pipe } from "effect";
import type { Effect } from "effect";

import type { Held } from "./deck.ts";
import { kurakuOf } from "./kuraku.ts";
import { MIX } from "./score.ts";
import { trackOf } from "./track.ts";

const TRACK_SHARE = 0.84;

export interface Tracking {
  readonly request: MixRequest;
  readonly held: Held;
}

const NAMES = pipe(
  MIX.tracks,
  Arr.map(({ name }) => name),
);

const DRUMS = new Set(
  pipe(
    MIX.tracks,
    Arr.filter((track) => track.drum === true),
    Arr.map(({ name }) => name),
  ),
);

export const renderTracks = ({ request, held }: Tracking): Effect.Effect<void> => {
  const done = { count: 0 };
  return request.parts(NAMES)((name, stem) => {
    const { left, right } = unpacked(stem);
    held.deck.write(held.slotOf(name, DRUMS.has(name)), left, right);
    done.count += 1;
    request.progress((done.count / NAMES.length) * TRACK_SHARE, Str.toLowerCase(name));
  });
};

export const trackPart = (request: MixRequest): ((name: string) => Stem) =>
  trackOf(kurakuOf(request));

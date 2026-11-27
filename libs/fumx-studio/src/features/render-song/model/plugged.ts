import type { Mixer, PluginUse, Song } from "@r_masseater/song-format";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Scope } from "effect";

import type { MixedStem } from "#/shared/lib/plugin/plugin.ts";

import type { Context } from "./context.ts";
import type { Mastered } from "./master.ts";
import type { Stem } from "./mixdown.ts";
import { mixPluginOf, requestOf } from "./request.ts";
import type { Unplayable } from "./unplayable.ts";

const CENTERED: Mixer = { volumeDecibels: 0, pan: 0, muted: false };

const mixerOf =
  (song: Song) =>
  (name: string): Mixer =>
    pipe(
      [...song.tracks, ...song.buses],
      Arr.findFirst((each) => each.name === name),
      Option.match({ onNone: () => CENTERED, onSome: (found) => found.mixer }),
    );

const stemOf =
  (song: Song) =>
  (stem: MixedStem): Stem => ({
    name: stem.name,
    bus: { left: stem.left, right: stem.right, mono: false, name: stem.name },
    events: [],
    mixer: mixerOf(song)(stem.name),
  });

export const pluggedMix =
  (context: Context) =>
  (use: PluginUse): Effect.Effect<Mastered, Unplayable, Scope.Scope> =>
    Effect.gen(function* plugged() {
      const plugin = yield* mixPluginOf(context)(use);
      const mix = yield* plugin.mix(requestOf(context)(use)(plugin));
      return {
        frames: context.frames,
        stems: pipe(mix.stems, Arr.map(stemOf(context.song))),
        left: mix.left,
        right: mix.right,
        stages: mix.stages,
        lanes: mix.lanes,
        live: mix.live,
      };
    });

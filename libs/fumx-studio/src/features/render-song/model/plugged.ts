import type { Mixer, PluginUse, Song } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { MixPlugin, MixedStem, PlayedEvent } from "#/shared/lib/plugin/plugin.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";

import type { Context } from "./context.ts";
import type { Mastered } from "./master.ts";
import type { Stem } from "./mixdown.ts";
import type { SongTrack } from "./placements.ts";
import { pastedInto, trackBusOf } from "./playing.ts";
import { Unplayable } from "./unplayable.ts";

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

const mixPluginOf =
  (context: Context) =>
  (use: PluginUse): Effect.Effect<MixPlugin, Unplayable> => {
    const found = pipe(
      Option.fromUndefinedOr(context.session.plugins[use.module]),
      Option.filter((plugin): plugin is MixPlugin => plugin.kind === "mix"),
    );
    return Effect.mapError(Effect.fromOption(found), () =>
      Unplayable.make({ part: `master mix ${use.plugin}` }),
    );
  };

const isHead = (track: SongTrack): boolean => Option.isNone(track.into);

const busFor =
  (buses: ReadonlyMap<string, Bus>) =>
  (track: SongTrack): Option.Option<Bus> => {
    const head = Option.getOrElse(track.into, () => track.name);
    return Option.fromUndefinedOr(buses.get(head));
  };

const playerOf =
  (context: Context) =>
  (buses: ReadonlyMap<string, Bus>) =>
  (name: string): readonly PlayedEvent[] =>
    pipe(
      context.song.tracks,
      Arr.findFirst((track) => track.name === name),
      Option.flatMap((track) =>
        Option.map(busFor(buses)(track), (bus) => pastedInto(context)(bus)([track])),
      ),
      Option.getOrElse((): readonly PlayedEvent[] => []),
    );

export const pluggedMix =
  (context: Context) =>
  (use: PluginUse): Effect.Effect<Mastered, Unplayable> =>
    Effect.gen(function* plugged() {
      const plugin = yield* mixPluginOf(context)(use);
      const buses = new Map(
        pipe(
          context.song.tracks,
          Arr.filter(isHead),
          Arr.map((track): readonly [string, Bus] => [track.name, trackBusOf(context)(track)]),
        ),
      );
      const mix = yield* plugin.mix({
        song: context.song,
        frames: context.frames,
        samples: context.samples,
        buses,
        play: playerOf(context)(buses),
        args: use.arguments,
        log: context.session.log,
        progress: context.session.progress,
      });
      return {
        frames: context.frames,
        stems: pipe(mix.stems, Arr.map(stemOf(context.song))),
        left: mix.left,
        right: mix.right,
        stages: mix.stages,
        lanes: mix.lanes,
      };
    });

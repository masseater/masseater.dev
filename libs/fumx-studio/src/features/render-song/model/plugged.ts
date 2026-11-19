import type { Mixer, PluginUse, Song } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Scope } from "effect";

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

const headOf = (track: SongTrack): string => Option.getOrElse(track.into, () => track.name);

const trackNamed =
  (context: Context) =>
  (name: string): Option.Option<SongTrack> =>
    pipe(
      context.song.tracks,
      Arr.findFirst((track) => track.name === name),
    );

const busesOf = (context: Context): ((head: string) => Option.Option<Bus>) => {
  const made = new Map<string, Bus>();
  return (head) =>
    pipe(
      trackNamed(context)(head),
      Option.filter(isHead),
      Option.map((track) => made.getOrInsertComputed(head, () => trackBusOf(context)(track))),
    );
};

const playedInto =
  (context: Context) =>
  (into: (track: SongTrack) => Option.Option<Bus>) =>
  (name: string): readonly PlayedEvent[] =>
    pipe(
      trackNamed(context)(name),
      Option.flatMap((track) =>
        Option.map(into(track), (bus) =>
          pastedInto(context)({ ...bus, name: headOf(track) })([track]),
        ),
      ),
      Option.getOrElse((): readonly PlayedEvent[] => []),
    );

export const pluggedMix =
  (context: Context) =>
  (use: PluginUse): Effect.Effect<Mastered, Unplayable, Scope.Scope> =>
    Effect.gen(function* plugged() {
      const plugin = yield* mixPluginOf(context)(use);
      const bus = busesOf(context);
      const mix = yield* plugin.mix({
        song: context.song,
        frames: context.frames,
        samples: context.samples,
        bus,
        play: playedInto(context)((track) => bus(headOf(track))),
        playInto: (into) => playedInto(context)(() => Option.some(into)),
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
        live: mix.live,
      };
    });

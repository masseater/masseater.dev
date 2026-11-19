import type { PluginUse } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { MixPlugin, MixRequest, PlayedEvent } from "#/shared/lib/plugin/plugin.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Stem as Packed } from "#/shared/lib/studio/stem.ts";

import type { Context } from "./context.ts";
import { partOf, partsOf } from "./parts.ts";
import type { SongTrack } from "./placements.ts";
import { pastedInto, trackBusOf } from "./playing.ts";
import { Unplayable } from "./unplayable.ts";

export const mixPluginOf =
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

export const requestOf =
  (context: Context) =>
  (use: PluginUse) =>
  (plugin: MixPlugin): MixRequest => {
    const bus = busesOf(context);
    const request: MixRequest = {
      song: context.song,
      frames: context.frames,
      samples: context.samples,
      bus,
      play: playedInto(context)((track) => bus(headOf(track))),
      playInto: (into) => playedInto(context)(() => Option.some(into)),
      args: use.arguments,
      log: context.session.log,
      progress: context.session.progress,
      parts: (keys) => partsOf(context.session)(plugin, () => request)(keys),
    };
    return request;
  };

export const pluggedPart =
  (context: Context) =>
  (use: PluginUse) =>
  (key: string): Effect.Effect<Packed, Unplayable> =>
    Effect.map(mixPluginOf(context)(use), (plugin) =>
      partOf(plugin)(requestOf(context)(use)(plugin))(key),
    );

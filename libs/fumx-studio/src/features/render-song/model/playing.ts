import type { Song } from "@r_masseater/song-format";
import { Array as Arr, Effect, Option, Predicate, pipe } from "effect";

import type { PlayedEvent, PlayedTrack } from "#/shared/lib/plugin/plugin.ts";
import { busOf } from "#/shared/lib/studio/bus.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Logged } from "#/shared/lib/studio/placement.ts";

import type { Context } from "./context.ts";
import { deskOf, loggedWithSends, pasted } from "./desk.ts";
import { hitsPlaced, notesPlaced, voicedNotesPlaced } from "./placements.ts";
import type { Placed, SongTrack } from "./placements.ts";

const placedOn =
  (context: Context) =>
  (track: SongTrack): readonly Placed[] => {
    const voicing = { ...context, plugins: context.session.plugins };
    return [
      ...notesPlaced(context)(track),
      ...voicedNotesPlaced(voicing)(track),
      ...hitsPlaced(voicing)(track),
    ];
  };

const sourceNameOf = (placed: Placed): string => {
  if (Predicate.isString(placed.source)) {
    return placed.source;
  }
  return placed.label;
};

const eventOf = (placed: Placed): PlayedEvent => ({
  source: sourceNameOf(placed),
  time: placed.time,
  placement: placed.placement,
  args: placed.args,
});

const labelOf = (placed: Placed): readonly (readonly [Float32Array, string])[] => {
  if (placed.label === "" || Predicate.isString(placed.source)) {
    return [];
  }
  return [[placed.source, placed.label]];
};

const sendsOf = (tracks: readonly SongTrack[]): SongTrack["sends"] =>
  pipe(Arr.head(tracks), Option.match({ onNone: () => [], onSome: (head) => head.sends }));

export const pastedInto =
  (context: Context) =>
  (bus: Bus) =>
  (tracks: readonly SongTrack[]): readonly PlayedEvent[] => {
    const held: Logged[] = [];
    const placed = pipe(tracks, Arr.flatMap(placedOn(context)));
    const labels = new Map(pipe(placed, Arr.flatMap(labelOf)));
    const desk = deskOf(context.frames)(context.samples)(labels)({
      push: (...entries) => held.push(...entries),
    });
    const play = pasted(desk)(context.buses)(bus);
    for (const each of placed) {
      play(each);
    }
    loggedWithSends(context.session.log)(held)(sendsOf(tracks));
    return pipe(placed, Arr.map(eventOf));
  };

export const layersOf =
  (song: Song) =>
  (track: SongTrack): readonly SongTrack[] =>
    pipe(
      song.tracks,
      Arr.filter((layer) => Option.contains(layer.into, track.name)),
    );

export const trackBusOf =
  (context: Context) =>
  (track: SongTrack): Bus =>
    busOf(context.frames)({ name: track.name, mono: track.mono });

export const played =
  (context: Context) =>
  (track: SongTrack): Effect.Effect<PlayedTrack> =>
    Effect.sync(() => {
      const bus = trackBusOf(context)(track);
      const events = pastedInto(context)(bus)([track, ...layersOf(context.song)(track)]);
      return { name: track.name, bus, events };
    });

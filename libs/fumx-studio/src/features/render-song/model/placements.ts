import type { Hit, Note, Slice, Song } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

import type { Placement } from "#/shared/lib/studio/placement.ts";

import type { Clock } from "./clock.ts";
import { nudged } from "./clock.ts";
import { placementOf, sendsOf } from "./params.ts";
import type { Send } from "./params.ts";

const MILLI = 1e-3;
const CENTS_PER_SEMITONE = 100;

export type SongTrack = Song["tracks"][number];

type Voice = Song["kits"][number]["voices"][number];

export interface Placed {
  readonly sample: string;
  readonly time: number;
  readonly placement: Placement;
  readonly sends: readonly Send[];
}

interface Zone {
  readonly path: string;
  readonly root: number;
}

export interface Timing {
  readonly clock: Clock;
  readonly song: Song;
}

const sourceZones = (source: Song["instruments"][number]["source"]): readonly Zone[] => {
  if (source.kind === "samples") {
    return source.zones;
  }
  return [];
};

const zonesIn =
  (instrument: string) =>
  (song: Song): readonly Zone[] =>
    pipe(
      song.instruments,
      Arr.findFirst((each) => each.name === instrument),
      Option.map((found) => sourceZones(found.source)),
      Option.getOrElse((): readonly Zone[] => []),
    );

const zonesOf =
  (song: Song) =>
  (track: SongTrack): readonly Zone[] => {
    if (track.source.kind !== "instrument") {
      return [];
    }
    return zonesIn(track.source.instrument)(song);
  };

const closer =
  (midi: number) =>
  (best: Zone, zone: Zone): Zone => {
    if (Math.abs(zone.root - midi) < Math.abs(best.root - midi)) {
      return zone;
    }
    return best;
  };

const nearestZone =
  (zones: readonly Zone[]) =>
  (midi: number): Option.Option<Zone> =>
    pipe(
      Arr.head(zones),
      Option.map((first) => {
        let best = first;
        for (const zone of zones) {
          best = closer(midi)(best, zone);
        }
        return best;
      }),
    );

const spanOf =
  ({ clock }: Timing) =>
  (event: Note | Hit | Slice): readonly [number, number] => {
    const time = nudged(clock.secondsAt(event.start))(event.nudgeMilliseconds);
    const end = nudged(clock.secondsAt(event.start + event.length))(event.nudgeMilliseconds);
    return [time, end - time];
  };

const bendOf = (note: Note): Placement =>
  pipe(
    note.bend,
    Arr.map((point): readonly [number, number] => [point.milliseconds * MILLI, point.semitones]),
    Option.liftPredicate(Arr.isReadonlyArrayNonEmpty),
    Option.match({ onNone: () => ({}), onSome: (pitch) => ({ pitch }) }),
  );

const zonePlaced =
  (timing: Timing) =>
  (note: Note) =>
  (zone: Zone): Placed => {
    const [time, length] = spanOf(timing)(note);
    const base: Placement = {
      gain: note.velocity,
      midi: zone.root,
      semitones: note.midi - zone.root + note.cents / CENTS_PER_SEMITONE,
      duration: length * note.gate,
      ...bendOf(note),
    };
    return {
      sample: zone.path,
      time,
      placement: placementOf(note.params)(base),
      sends: sendsOf(note.params),
    };
  };

export const notesPlaced =
  (timing: Timing) =>
  (track: SongTrack): readonly Placed[] => {
    const nearest = nearestZone(zonesOf(timing.song)(track));
    return pipe(
      timing.song.notes,
      Arr.filter((note) => note.track === track.name),
      Arr.flatMap((note) =>
        pipe(nearest(note.midi), Option.map(zonePlaced(timing)(note)), Option.toArray),
      ),
    );
  };

const voicesOf =
  (song: Song) =>
  (track: SongTrack): readonly Voice[] => {
    if (track.source.kind !== "kit") {
      return [];
    }
    const { kit } = track.source;
    return pipe(
      song.kits,
      Arr.findFirst((each) => each.name === kit),
      Option.map((found) => found.voices),
      Option.getOrElse((): readonly Voice[] => []),
    );
  };

const voicePlaced =
  (timing: Timing) =>
  (hit: Hit) =>
  (voice: Voice): Placed => {
    const [time] = spanOf(timing)(hit);
    const params = [...voice.params, ...hit.params];
    return {
      sample: voice.path,
      time,
      placement: placementOf(params)({ gain: hit.velocity }),
      sends: sendsOf(params),
    };
  };

export const hitsPlaced =
  (timing: Timing) =>
  (track: SongTrack): readonly Placed[] => {
    const voices = voicesOf(timing.song)(track);
    return pipe(
      timing.song.hits,
      Arr.filter((hit) => hit.track === track.name),
      Arr.flatMap((hit) =>
        pipe(
          voices,
          Arr.findFirst((voice) => voice.name === hit.voice),
          Option.map(voicePlaced(timing)(hit)),
          Option.toArray,
        ),
      ),
    );
  };

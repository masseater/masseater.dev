import type { Hit, Note, PluginArgument, PluginUse, Slice, Song } from "@r_masseater/song-format";
import { Array as Arr, Option, pipe } from "effect";

import type { Clock } from "#/entities/clock/index.ts";
import { nudged } from "#/entities/clock/index.ts";
import type { InstrumentPlugin, Plugins, Samples } from "#/shared/lib/plugin/plugin.ts";
import type { Source } from "#/shared/lib/studio/paste.ts";
import type { Placement } from "#/shared/lib/studio/placement.ts";

import { placementOf, sendsOf } from "./params.ts";
import type { Send } from "./params.ts";

const CENTS_PER_SEMITONE = 100;

export type SongTrack = Song["tracks"][number];

type Voice = Song["kits"][number]["voices"][number];

export interface Placed {
  readonly source: Source;
  readonly label: string;
  readonly time: number;
  readonly placement: Placement;
  readonly sends: readonly Send[];
  readonly args: readonly PluginArgument[];
}

interface Zone {
  readonly path: string;
  readonly root: number;
}

export interface Timing {
  readonly clock: Clock;
  readonly song: Song;
}

export interface Voicing extends Timing {
  readonly plugins: Plugins;
  readonly samples: Samples;
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
    const time = nudged(clock.secondsAt(event.start))(event.nudgeSeconds);
    const end = nudged(clock.secondsAt(event.start + event.length))(event.nudgeSeconds);
    return [time, end - time];
  };

const bendOf = (event: Note | Hit): Placement =>
  pipe(
    event.bend,
    Arr.map((point): readonly [number, number] => [point.seconds, point.semitones]),
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
      source: zone.path,
      label: "",
      time,
      placement: placementOf(note.params)(base),
      sends: sendsOf(note.params),
      args: note.args,
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

const midiOf = (midi: Option.Option<number>): Placement =>
  Option.match(midi, { onNone: () => ({}), onSome: (given) => ({ midi: given }) });

const instrumentIn =
  (voicing: Voicing) =>
  (use: PluginUse): Option.Option<InstrumentPlugin> =>
    pipe(
      Option.fromUndefinedOr(voicing.plugins[use.module]),
      Option.filter((plugin): plugin is InstrumentPlugin => plugin.kind === "instrument"),
    );

const soundOf =
  (voicing: Voicing) =>
  (hit: Hit) =>
  (voice: Voice): Option.Option<readonly [Source, string, Placement]> =>
    Option.match(voice.plugin, {
      onNone: () => Option.some([voice.path, "", {}] as const),
      onSome: (use) =>
        pipe(
          instrumentIn(voicing)(use),
          Option.map((plugin) => {
            const sound = plugin.voice({
              pitch: Option.none(),
              args: [...use.arguments, ...hit.args],
              samples: voicing.samples,
            });
            return [sound.sound, sound.label, midiOf(sound.midi)] as const;
          }),
        ),
    });

const voicePlaced =
  (voicing: Voicing) =>
  (hit: Hit) =>
  (voice: Voice): Option.Option<Placed> =>
    Option.map(soundOf(voicing)(hit)(voice), ([source, label, pitched]) => {
      const [time] = spanOf(voicing)(hit);
      const params = [...voice.params, ...hit.params];
      return {
        source,
        label,
        time,
        placement: placementOf(params)({ gain: hit.velocity, ...pitched, ...bendOf(hit) }),
        sends: sendsOf(params),
        args: hit.args,
      };
    });

export const hitsPlaced =
  (voicing: Voicing) =>
  (track: SongTrack): readonly Placed[] => {
    const voices = voicesOf(voicing.song)(track);
    return pipe(
      voicing.song.hits,
      Arr.filter((hit) => hit.track === track.name),
      Arr.flatMap((hit) =>
        pipe(
          voices,
          Arr.findFirst((voice) => voice.name === hit.voice),
          Option.flatMap(voicePlaced(voicing)(hit)),
          Option.toArray,
        ),
      ),
    );
  };

const pluginOf =
  (song: Song) =>
  (track: SongTrack): Option.Option<PluginUse> => {
    if (track.source.kind !== "instrument") {
      return Option.none();
    }
    const { instrument } = track.source;
    return pipe(
      song.instruments,
      Arr.findFirst((each) => each.name === instrument),
      Option.flatMap((found) => {
        if (found.source.kind === "plugin") {
          return Option.some(found.source);
        }
        return Option.none();
      }),
    );
  };

const voicedPlaced =
  (voicing: Voicing) =>
  (use: PluginUse) =>
  (note: Note): Option.Option<Placed> =>
    pipe(
      instrumentIn(voicing)(use),
      Option.map((plugin) => {
        const voice = plugin.voice({
          pitch: Option.some(note.midi + note.cents / CENTS_PER_SEMITONE),
          args: [...use.arguments, ...note.args],
          samples: voicing.samples,
        });
        const [time, length] = spanOf(voicing)(note);
        const base: Placement = {
          gain: note.velocity,
          midi: note.midi,
          duration: length * note.gate,
          ...bendOf(note),
        };
        return {
          source: voice.sound,
          label: voice.label,
          time,
          placement: placementOf(note.params)(base),
          sends: sendsOf(note.params),
          args: note.args,
        };
      }),
    );

export const voicedNotesPlaced =
  (voicing: Voicing) =>
  (track: SongTrack): readonly Placed[] =>
    Option.match(pluginOf(voicing.song)(track), {
      onNone: () => [],
      onSome: (use) =>
        pipe(
          voicing.song.notes,
          Arr.filter((note) => note.track === track.name),
          Arr.flatMap((note) => Option.toArray(voicedPlaced(voicing)(use)(note))),
        ),
    });

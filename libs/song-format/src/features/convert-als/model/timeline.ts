import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

import { sortedByTick, sortedNotes } from "#/entities/timeline/index.ts";
import type { Part, TempoChange, Timeline, TimelineNote } from "#/entities/timeline/index.ts";
import type { From } from "#/shared/lib/from.ts";

import { notesOfClip } from "./clips.ts";
import type { PlayedNote } from "./clips.ts";
import type { AlsMidiTrack, LiveSet } from "./live-set.ts";
import { locatorsOf, metersOf, tempoPointsOf, tempoSegmentsOf } from "./tempo-map.ts";

const QUARTERS_PER_WHOLE = 4;
const TICKS_PER_BEAT = TICKS_PER_WHOLE / QUARTERS_PER_WHOLE;
const MICROSECONDS_PER_MINUTE = 60_000_000;
const MELODIC_CHANNEL = 0;
const DRUM_CHANNEL = 9;
const NONE = 0;
const NEXT = 1;

interface Tick {
  readonly tick: number;
  readonly exact: boolean;
}

const tickOf: From<number, Tick> = (beat) => {
  const exact = beat * TICKS_PER_BEAT;
  return { tick: Math.round(exact), exact: Number.isInteger(exact) };
};

const microsecondsOf: From<number, number> = (bpm) => Math.round(MICROSECONDS_PER_MINUTE / bpm);

const nameOf: From<AlsMidiTrack, Option.Option<string>> = (track) =>
  pipe(
    [track.Name.EffectiveName?.Value, track.Name.UserName?.Value],
    Arr.map(Option.fromUndefinedOr),
    Arr.getSomes,
    Arr.findFirst((name) => name !== ""),
  );

const isDrumRack: From<AlsMidiTrack, boolean> = (track) =>
  track.DeviceChain.DeviceChain?.Devices?.DrumGroupDevice !== undefined;

interface TrackNotes {
  readonly notes: readonly TimelineNote[];
  readonly offGrid: number;
}

const trackNotesOf: From<AlsMidiTrack, TrackNotes> = (track) => {
  const played: readonly PlayedNote[] = pipe(
    track.DeviceChain.MainSequencer.ClipTimeable.ArrangerAutomation.Events.MidiClip ?? [],
    Arr.flatMap(notesOfClip),
  );
  const placed = Arr.map(played, (note) => ({
    note,
    start: tickOf(note.beat),
    end: tickOf(note.beat + note.length),
  }));
  return {
    notes: sortedNotes(
      Arr.map(placed, ({ note, start, end }): TimelineNote => ({
        tick: start.tick,
        end: end.tick,
        midi: note.midi,
        velocity: note.velocity,
        release: note.release,
      })),
    ),
    offGrid: Arr.countBy(placed, ({ start, end }) => !start.exact || !end.exact),
  };
};

interface PartRead {
  readonly part: Part;
  readonly offGrid: number;
}

const partOf = (track: AlsMidiTrack, index: number): PartRead => {
  const read = trackNotesOf(track);
  return {
    part: {
      track: index,
      channel: isDrumRack(track) ? DRUM_CHANNEL : MELODIC_CHANNEL,
      name: nameOf(track),
      program: Option.none(),
      notes: read.notes,
      controls: [],
      lyrics: [],
    },
    offGrid: read.offGrid,
  };
};

const temposOf: From<LiveSet, readonly TempoChange[]> = (liveSet) =>
  pipe(
    tempoSegmentsOf(tempoPointsOf(liveSet)),
    Arr.map((segment): TempoChange => ({
      tick: tickOf(segment.beat).tick,
      microseconds: microsecondsOf(segment.bpm),
      target: Option.map(segment.target, microsecondsOf),
    })),
  );

const lastOf: From<readonly number[], number> = (ticks) =>
  Arr.reduce(ticks, NONE, (latest, tick) => Math.max(latest, tick));

export const timelineOf: From<LiveSet, Timeline> = (liveSet) => {
  const reads = pipe(
    liveSet.Tracks.MidiTrack ?? [],
    Arr.map(partOf),
    Arr.filter((read) => Arr.isReadonlyArrayNonEmpty(read.part.notes)),
  );
  const parts = Arr.map(reads, (read) => read.part);
  const markers = sortedByTick(
    Arr.map(locatorsOf(liveSet), (locator) => ({
      tick: tickOf(locator.beat).tick,
      text: locator.name,
    })),
  );
  const tempos = temposOf(liveSet);
  const meters = Arr.map(metersOf(liveSet), (meter) => ({
    tick: tickOf(meter.beat).tick,
    numerator: meter.numerator,
    denominator: meter.denominator,
  }));
  return {
    title: Option.none(),
    end: lastOf([
      ...Arr.flatMap(parts, (part) => Arr.map(part.notes, (note) => note.end)),
      ...Arr.map([...markers, ...tempos, ...meters], (point) => point.tick + NEXT),
    ]),
    offGrid: Arr.reduce(reads, NONE, (sum, read) => sum + read.offGrid),
    tempos,
    meters,
    markers,
    parts,
  };
};

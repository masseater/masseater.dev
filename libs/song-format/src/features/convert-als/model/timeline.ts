import { Array as Arr, Boolean as Bool, Option, pipe } from "effect";

import { sortedByTick, sortedNotes } from "#/entities/timeline/index.ts";
import type { Part, TempoChange, Timeline, TimelineNote } from "#/entities/timeline/index.ts";
import type { From } from "#/shared/lib/from.ts";

import { notesOfClip } from "./clips.ts";
import type { PlayedNote } from "./clips.ts";
import type { AlsMidiTrack, LiveSet } from "./live-set.ts";
import { mixOf } from "./mix.ts";
import { locatorsOf, metersOf, tempoPointsOf, tempoSegmentsOf } from "./tempo-map.ts";
import { tickOf } from "./ticks.ts";

const MICROSECONDS_PER_MINUTE = 60_000_000;
const MELODIC_CHANNEL = 0;
const DRUM_CHANNEL = 9;
const NONE = 0;
const NEXT = 1;

const microsecondsOf: From<number, number> = (bpm) => Math.round(MICROSECONDS_PER_MINUTE / bpm);

const nameOf: From<AlsMidiTrack["Name"], Option.Option<string>> = (label) =>
  pipe(
    [label.EffectiveName, label.UserName],
    Arr.map(Option.fromUndefinedOr),
    Arr.getSomes,
    Arr.map((name) => name.Value),
    Arr.findFirst((name) => name !== ""),
  );

const isDrumRack: From<AlsMidiTrack, boolean> = (track) =>
  pipe(
    Option.fromUndefinedOr(track.DeviceChain.DeviceChain),
    Option.flatMap((chain) => Option.fromUndefinedOr(chain.Devices)),
    Option.flatMap((devices) => Option.fromUndefinedOr(devices.DrumGroupDevice)),
    Option.isSome,
  );

interface TrackNotes {
  readonly notes: readonly TimelineNote[];
  readonly offGrid: number;
}

const trackNotesOf: From<AlsMidiTrack, TrackNotes> = (track) => {
  const played: readonly PlayedNote[] = pipe(
    track.DeviceChain.MainSequencer.ClipTimeable.ArrangerAutomation.Events.MidiClip ?? [],
    Arr.flatMap(notesOfClip),
  );
  const placed = pipe(
    played,
    Arr.map((note) => ({
      note,
      start: tickOf(note.beat),
      end: tickOf(note.beat + note.length),
    })),
  );
  return {
    notes: sortedNotes(
      pipe(
        placed,
        Arr.map(({ note, start, end }): TimelineNote => ({
          tick: start.tick,
          end: end.tick,
          midi: note.midi,
          velocity: note.velocity,
          release: note.release,
        })),
      ),
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
      channel: Bool.match(isDrumRack(track), {
        onFalse: () => MELODIC_CHANNEL,
        onTrue: () => DRUM_CHANNEL,
      }),
      name: nameOf(track.Name),
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
      target: pipe(segment.target, Option.map(microsecondsOf)),
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
  const parts = pipe(
    reads,
    Arr.map((read) => read.part),
  );
  const markers = sortedByTick(
    pipe(
      locatorsOf(liveSet),
      Arr.map((locator) => ({ tick: tickOf(locator.beat).tick, text: locator.name })),
    ),
  );
  const tempos = temposOf(liveSet);
  const meters = pipe(
    metersOf(liveSet),
    Arr.map((meter) => ({
      tick: tickOf(meter.beat).tick,
      numerator: meter.numerator,
      denominator: meter.denominator,
    })),
  );
  const noteEnds = pipe(
    parts,
    Arr.flatMap((part) => part.notes),
    Arr.map((note) => note.end),
  );
  const pointEnds = pipe(
    [...markers, ...tempos, ...meters],
    Arr.map((point) => point.tick + NEXT),
  );
  return {
    title: Option.none(),
    end: lastOf([...noteEnds, ...pointEnds]),
    offGrid: Arr.reduce(reads, NONE, (sum, read) => sum + read.offGrid),
    tempos,
    meters,
    markers,
    parts,
    mix: mixOf(nameOf)(liveSet),
  };
};

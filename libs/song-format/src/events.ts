import { Array as Arr, Match, Option, pipe } from "effect";
import { Note as TonalNote } from "tonal";

import type { Hit, Note, Part, Role, Song } from "./song.ts";
import { timelineOf } from "./time.ts";
import type { Span, Timeline } from "./time.ts";

const NONE = 0;
const ONE_TICK = 1;

export interface Sounding extends Span {
  readonly part: number;
  readonly index: number;
  readonly name: string;
  readonly role: Role;
  readonly note: Note;
  readonly midi: number;
  readonly pitchClass: string;
}

export interface Struck {
  readonly part: number;
  readonly index: number;
  readonly name: string;
  readonly hit: Hit;
  readonly at: number;
}

export interface Events {
  readonly timeline: Timeline;
  readonly notes: readonly Sounding[];
  readonly hits: readonly Struck[];
  readonly end: number;
}

interface Owner {
  readonly timeline: Timeline;
  readonly part: number;
  readonly name: string;
  readonly role: Role;
}

const soundingOf =
  ({ timeline, part, name, role }: Owner) =>
  (note: Note, index: number): Option.Option<Sounding> =>
    pipe(
      Option.fromNullishOr(TonalNote.midi(note.pitch)),
      Option.map((midi) => {
        const start = timeline.tickOf(note);
        return {
          part,
          index,
          name,
          role,
          note,
          midi,
          pitchClass: TonalNote.pitchClass(note.pitch),
          start,
          end: start + note.length,
        };
      }),
    );

const notesOf =
  (timeline: Timeline) =>
  (part: Part, partIndex: number): readonly Sounding[] =>
    Match.value(part).pipe(
      Match.discriminatorsExhaustive("kind")({
        pitched: (pitched) =>
          pipe(
            pitched.notes,
            Arr.map(
              soundingOf({ timeline, part: partIndex, name: pitched.name, role: pitched.role }),
            ),
            Arr.getSomes,
          ),
        drums: () => [],
      }),
    );

const hitsOf =
  (timeline: Timeline) =>
  (part: Part, partIndex: number): readonly Struck[] =>
    Match.value(part).pipe(
      Match.discriminatorsExhaustive("kind")({
        pitched: () => [],
        drums: (drums) =>
          pipe(
            drums.hits,
            Arr.map((hit, index) => ({
              part: partIndex,
              index,
              name: drums.name,
              hit,
              at: timeline.tickOf(hit),
            })),
          ),
      }),
    );

const later = (last: number, end: number): number => Math.max(last, end);

const latest = (ends: readonly number[]): number => Arr.reduce(ends, NONE, later);

export const eventsOf = (song: Song): Events => {
  const timeline = timelineOf(song);
  const notes = pipe(song.parts, Arr.map(notesOf(timeline)), Arr.flatten);
  const hits = pipe(song.parts, Arr.map(hitsOf(timeline)), Arr.flatten);
  const noteEnds = pipe(
    notes,
    Arr.map((note) => note.end),
  );
  const hitEnds = pipe(
    hits,
    Arr.map((hit) => hit.at + ONE_TICK),
  );
  const end = Math.max(latest(noteEnds), latest(hitEnds));
  return { timeline, notes, hits, end };
};

export const lastBarOf = ({ timeline, end }: Events): number => {
  if (end === NONE) {
    return NONE;
  }
  return timeline.barOf(end - ONE_TICK);
};

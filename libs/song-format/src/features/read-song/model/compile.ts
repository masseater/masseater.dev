import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { Predicate } from "effect";

import type { Edit, Hit, Note, Slice, Song } from "#/entities/song/index.ts";
import type { Song as SongNode } from "#generated/langium/ast.ts";

import { barsOfSong } from "./bars.ts";
import type { PlacedItem } from "./bars.ts";
import { declarationsOf } from "./declarations.ts";
import type { Item, NoteItem } from "./items.ts";
import { automationsProblemsOf } from "./mixer.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";

type PlacedOf<Kind extends Item["kind"]> = PlacedItem & {
  readonly item: Extract<Item, { readonly kind: Kind }>;
};

type PlacedNote = PlacedOf<"note">;

type Timed = Pick<
  Note,
  "track" | "line" | "bar" | "offset" | "start" | "length" | "nudgeMilliseconds"
>;

const timedOf: From<PlacedItem, Timed> = (placed) => ({
  track: placed.track,
  line: placed.line,
  bar: placed.bar,
  offset: placed.item.offset,
  start: placed.start,
  length: placed.item.length,
  nudgeMilliseconds: placed.item.nudgeMilliseconds,
});

const noteOf: From<PlacedNote, Note> = (placed) => {
  const { midi, cents, velocity, gate, articulation, lyric, bend, params }: NoteItem = placed.item;
  return { ...timedOf(placed), midi, cents, velocity, gate, articulation, lyric, bend, params };
};

const joined = (head: Note, tail: Note): Note => {
  const length = head.length + tail.length;
  return { ...head, length, gate: (head.length + tail.length * tail.gate) / length };
};

const keyOf = (track: string, midi: number, start: number): string =>
  `${track}:${String(midi)}:${String(start)}`;

interface Tied {
  readonly notes: readonly Note[];
  readonly problems: readonly Problem[];
}

const tieNotes: From<readonly PlacedNote[], Tied> = (placed) => {
  const byStart = Arr.groupBy(placed, (note) => keyOf(note.track, note.item.midi, note.start));
  const successorOf: From<PlacedNote, Option.Option<PlacedNote>> = (note) =>
    pipe(
      note.item.tie,
      Option.flatMap(() =>
        Rec.get(byStart, keyOf(note.track, note.item.midi, note.start + note.item.length)),
      ),
      Option.map(Arr.headNonEmpty),
    );
  const consumed: ReadonlySet<PlacedNote> = new Set(
    pipe(placed, Arr.map(successorOf), Arr.getSomes),
  );
  const follow: From<Note, From<PlacedNote, Compiled<Note>>> = (note) => (current) =>
    Option.match(current.item.tie, {
      onNone: () => ({ value: note, problems: [] }),
      onSome: (tie) =>
        Option.match(successorOf(current), {
          onNone: () => ({
            value: note,
            problems: [problemAt(tie)("tie")("tie の続きの音が次の小節の頭にありません")],
          }),
          onSome: (next) => follow(joined(note, noteOf(next)))(next),
        }),
    });
  const chains = pipe(
    placed,
    Arr.filter((note) => !consumed.has(note)),
    Arr.map((head) => follow(noteOf(head))(head)),
  );
  return {
    notes: pipe(
      chains,
      Arr.map((chain) => chain.value),
    ),
    problems: problemsOf(chains),
  };
};

const isKind =
  <Kind extends Item["kind"]>(kind: Kind): Predicate.Refinement<PlacedItem, PlacedOf<Kind>> =>
  (placed): placed is PlacedOf<Kind> =>
    placed.item.kind === kind;

const hitOf: From<PlacedOf<"hit">, Hit> = (placed) => {
  const { voice, velocity, params } = placed.item;
  return { ...timedOf(placed), voice, velocity, params };
};

const sliceOf: From<PlacedOf<"slice">, Slice> = (placed) => {
  const { sample, index, velocity, params } = placed.item;
  return { ...timedOf(placed), sample, index, velocity, params };
};

const editOf: From<PlacedOf<"edit">, Edit> = (placed) => {
  const { edit, every, fadeMilliseconds } = placed.item;
  return { ...timedOf(placed), edit, every, fadeMilliseconds };
};

export const compileSong: From<SongNode, Compiled<Song>> = (song) => {
  const declarations = declarationsOf(song);
  const bars = barsOfSong(declarations.value.kits)(song.bars);
  const placed = pipe(
    bars.value,
    Arr.flatMap((bar) => bar.items),
  );
  const notes = pipe(placed, Arr.filter(isKind("note")));
  const tied = tieNotes(notes);
  return {
    value: {
      title: song.title,
      ...declarations.value,
      bars: pipe(
        bars.value,
        Arr.map((bar) => bar.bar),
      ),
      notes: tied.notes,
      hits: pipe(placed, Arr.filter(isKind("hit")), Arr.map(hitOf)),
      slices: pipe(placed, Arr.filter(isKind("slice")), Arr.map(sliceOf)),
      edits: pipe(placed, Arr.filter(isKind("edit")), Arr.map(editOf)),
      automations: pipe(
        bars.value,
        Arr.flatMap((bar) => bar.automations),
      ),
    },
    problems: [
      ...declarations.problems,
      ...bars.problems,
      ...tied.problems,
      ...automationsProblemsOf(song),
    ],
  };
};

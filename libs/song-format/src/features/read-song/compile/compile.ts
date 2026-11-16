import { Array as Arr, Option, pipe } from "effect";
import type { Predicate } from "effect";

import type { Edit, Hit, Note, Slice } from "#/entities/song/events.ts";
import type { Song } from "#/entities/song/song.ts";
import type { Song as SongNode } from "#generated/langium/ast.ts";

import { barsOfSong } from "./bars.ts";
import type { PlacedItem } from "./bars.ts";
import { declarationsOf } from "./declarations.ts";
import type { Item, NoteItem } from "./items.ts";
import { problemAt } from "./problem.ts";
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

const continues =
  (note: Note): From<PlacedNote, boolean> =>
  (candidate) =>
    candidate.track === note.track &&
    candidate.item.midi === note.midi &&
    candidate.start === note.start + note.length;

const joined = (head: Note, tail: Note): Note => {
  const length = head.length + tail.length;
  return { ...head, length, gate: (head.length + tail.length * tail.gate) / length };
};

interface Chain {
  readonly note: Note;
  readonly consumed: readonly number[];
  readonly problems: readonly Problem[];
}

const followOf: From<readonly PlacedNote[], From<Chain, From<PlacedNote, Chain>>> =
  (placed) => (chain) => (current) =>
    Option.match(current.item.tie, {
      onNone: () => chain,
      onSome: (tie) =>
        pipe(
          placed,
          Arr.findFirstWithIndex(
            (candidate, index) =>
              !Arr.contains(chain.consumed, index) && continues(chain.note)(candidate),
          ),
          Option.match({
            onNone: () => ({
              ...chain,
              problems: [
                ...chain.problems,
                problemAt(tie)("tie")("tie の続きの音が次の小節の頭にありません"),
              ],
            }),
            onSome: ([next, index]) =>
              followOf(placed)({
                note: joined(chain.note, noteOf(next)),
                consumed: [...chain.consumed, index],
                problems: chain.problems,
              })(next),
          }),
        ),
    });

interface Tied {
  readonly notes: readonly Note[];
  readonly consumed: readonly number[];
  readonly problems: readonly Problem[];
}

const UNTIED: Tied = { notes: [], consumed: [], problems: [] };

const tieNotes: From<readonly PlacedNote[], Tied> = (placed) =>
  Arr.reduce(placed, UNTIED, (state, candidate, index) => {
    if (Arr.contains(state.consumed, index)) {
      return state;
    }
    const chain = followOf(placed)({
      note: noteOf(candidate),
      consumed: [...state.consumed, index],
      problems: state.problems,
    })(candidate);
    return {
      notes: [...state.notes, chain.note],
      consumed: chain.consumed,
      problems: chain.problems,
    };
  });

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
    problems: [...declarations.problems, ...bars.problems, ...tied.problems],
  };
};

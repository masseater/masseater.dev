import { Array as Arr, Predicate, pipe } from "effect";

import type { Edit, Hit, Note, Slice, Song } from "#/entities/song/index.ts";
import { isBar } from "#generated/langium/ast.ts";
import type { Song as SongNode } from "#generated/langium/ast.ts";

import { barsOfSong } from "./bars.ts";
import type { PlacedItem } from "./bars.ts";
import { declarationsOf } from "./declarations.ts";
import { clashProblemsOf, importedOf, withImported } from "./imports.ts";
import { automationsProblemsOf } from "./mixer.ts";
import { problemAt } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";
import { programOf } from "./program.ts";
import { joined, tieChains } from "./ties.ts";

type Item = PlacedItem["item"];

type NoteItem = Extract<Item, { readonly kind: "note" }>;

type PlacedOf<Kind extends Item["kind"]> = PlacedItem & {
  readonly item: Extract<Item, { readonly kind: Kind }>;
};

type PlacedNote = PlacedOf<"note">;

type Timed = Pick<
  Note,
  | "track"
  | "line"
  | "sourceLine"
  | "sourceColumn"
  | "bar"
  | "offset"
  | "start"
  | "length"
  | "nudgeMilliseconds"
  | "nudgeSeconds"
>;

const timedOf: From<PlacedItem, Timed> = (placed) => ({
  track: placed.track,
  line: placed.line,
  sourceLine: placed.item.sourceLine,
  sourceColumn: placed.item.sourceColumn,
  bar: placed.bar,
  offset: placed.item.offset,
  start: placed.start,
  length: placed.item.length,
  nudgeMilliseconds: placed.item.nudgeMilliseconds,
  nudgeSeconds: placed.item.nudgeSeconds,
});

const noteOf: From<PlacedNote, Note> = (placed) => {
  const {
    midi,
    cents,
    velocity,
    releaseVelocity,
    gate,
    articulation,
    lyric,
    bend,
    params,
    args,
  }: NoteItem = placed.item;
  return {
    ...timedOf(placed),
    midi,
    cents,
    velocity,
    releaseVelocity,
    gate,
    articulation,
    lyric,
    bend,
    params,
    args,
  };
};

const gateJoined: From<readonly [Note, Note], Note> = ([head, tail]) => {
  const length = head.length + tail.length;
  return { ...joined([head, tail]), gate: (head.length + tail.length * tail.gate) / length };
};

const tieNotes = tieChains<PlacedNote, Note>({
  identity: (note) => `${note.track}:${String(note.item.midi)}`,
  valueOf: (note) => noteOf(note),
  join: gateJoined,
});

const isKind =
  <Kind extends Item["kind"]>(kind: Kind): Predicate.Refinement<PlacedItem, PlacedOf<Kind>> =>
  (placed): placed is PlacedOf<Kind> =>
    placed.item.kind === kind;

const hitOf: From<PlacedOf<"hit">, Hit> = (placed) => {
  const { voice, velocity, releaseVelocity, bend, params, args } = placed.item;
  return { ...timedOf(placed), voice, velocity, releaseVelocity, bend, params, args };
};

const tieHits = tieChains<PlacedOf<"hit">, Hit>({
  identity: (hit) => `${hit.track}:${hit.item.voice}`,
  valueOf: hitOf,
  join: joined,
});

const sliceOf: From<PlacedOf<"slice">, Slice> = (placed) => {
  const { sample, index, velocity, params } = placed.item;
  return { ...timedOf(placed), sample, index, velocity, params };
};

const editOf: From<PlacedOf<"edit">, Edit> = (placed) => {
  const { edit, every, fadeMilliseconds } = placed.item;
  return { ...timedOf(placed), edit, every, fadeMilliseconds };
};

const titleProblemsOf: From<SongNode, readonly Problem[]> = (song) => {
  const hasBars = pipe(
    song.body,
    Arr.some((statement) => isBar(statement)),
  );
  if (!Predicate.isString(song.title) && hasBars) {
    return [problemAt(song)("bars")('小節を書くファイルには song "題名" を書きます')];
  }
  return [];
};

export const compileSong: From<SongNode, Compiled<Song>> = (song) => {
  const declarations = declarationsOf(song.declarations);
  const merged = withImported(importedOf(song))(declarations.value);
  const program = programOf(song);
  const bars = barsOfSong(merged.kits)(program.value);
  const placed = pipe(
    bars.value,
    Arr.flatMap((bar) => bar.items),
  );
  const notes = pipe(placed, Arr.filter(isKind("note")));
  const tied = tieNotes(notes);
  const hitItems = pipe(placed, Arr.filter(isKind("hit")));
  const hits = tieHits(hitItems);
  return {
    value: {
      title: song.title ?? "",
      ...merged,
      bars: pipe(
        bars.value,
        Arr.map((bar) => bar.bar),
      ),
      notes: tied.values,
      hits: hits.values,
      slices: pipe(placed, Arr.filter(isKind("slice")), Arr.map(sliceOf)),
      edits: pipe(placed, Arr.filter(isKind("edit")), Arr.map(editOf)),
      automations: pipe(
        bars.value,
        Arr.flatMap((bar) => bar.automations),
      ),
      controls: pipe(
        bars.value,
        Arr.flatMap((bar) => bar.controls),
      ),
    },
    problems: [
      ...declarations.problems,
      ...bars.problems,
      ...tied.problems,
      ...hits.problems,
      ...automationsProblemsOf(program.value),
      ...clashProblemsOf(song),
      ...titleProblemsOf(song),
      ...program.problems,
    ],
  };
};

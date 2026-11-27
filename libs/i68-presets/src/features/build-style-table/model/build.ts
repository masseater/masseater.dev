import { midiToFumx } from "@masseater.dev/song-format/convert-midi";
import { readSong } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Effect, Record as Rec, Schema, pipe } from "effect";
import { VerovioToolkit } from "verovio/esm";
import createVerovioModule from "verovio/wasm-hum";

import { progressionOf } from "#/shared/lib/degrees.ts";
import { sortedRecord } from "#/shared/lib/sorted-record.ts";
import type { StyleTable, Transitions } from "#/shared/lib/style-table.ts";

import { BACH_SOURCE, bachChorales } from "./corpus.ts";
import type { Score } from "./corpus.ts";

const ORDER = 3;
const MIN_COUNT = 2;
const FIRST = 1;

const taggedError = Schema.TaggedError;

export class UnreadableScore extends taggedError<
  UnreadableScore,
  { readonly brand: unique symbol }
>()("UnreadableScore", { message: Schema.String }) {}

interface Transition {
  readonly context: string;
  readonly next: string;
}

const tokensOf = Effect.fn("tokensOf")(function* tokensOf(
  toolkit: Readonly<VerovioToolkit>,
  score: Score,
) {
  toolkit.loadData(score.kern);
  const bytes = Uint8Array.from(Buffer.from(toolkit.renderToMIDI(), "base64"));
  const fumx = yield* midiToFumx({ bytes, title: score.name });
  const read = yield* readSong({
    path: `/${score.name}.fumx`,
    read: () => Effect.succeed(fumx.text),
  });
  if (read.status === "invalid") {
    return yield* UnreadableScore.make({ message: `${score.name} did not read back as fumx` });
  }
  const soundings = soundingsOf(read.song);
  return pipe(
    progressionOf(soundings)(read.song),
    Arr.map((step) => step.token),
  );
});

const contextAt =
  (tokens: readonly string[], index: number) =>
  (length: number): string =>
    pipe(tokens, Arr.drop(index - length), Arr.take(length), Arr.join(" "));

const transitionsIn = (tokens: readonly string[]): readonly Transition[] =>
  pipe(
    Arr.makeBy(tokens.length, (index) => index),
    Arr.drop(FIRST),
    Arr.flatMap((index) =>
      pipe(
        Arr.range(FIRST, Math.min(ORDER, index)),
        Arr.map(contextAt(tokens, index)),
        Arr.map((context) => ({ context, next: Arr.getUnsafe(tokens, index) })),
      ),
    ),
  );

const nextCounts = (
  transitions: Arr.NonEmptyReadonlyArray<Transition>,
): Readonly<Record<string, number>> =>
  sortedRecord(
    pipe(
      Arr.groupBy(transitions, (transition) => transition.next),
      Rec.map((group) => group.length),
      Rec.toEntries,
      Arr.filter(([, seen]) => seen >= MIN_COUNT),
    ),
  );

const transitionsOf = (all: readonly Transition[]): Transitions =>
  sortedRecord(
    pipe(
      Arr.groupBy(all, (transition) => transition.context),
      Rec.map(nextCounts),
      Rec.toEntries,
      Arr.filter(([, next]) => !Rec.isEmptyRecord(next)),
    ),
  );

/** @internal */
export const buildBachTable = Effect.fn("buildBachTable")(function* buildBachTable() {
  const module = yield* Effect.promise(() => createVerovioModule());
  const toolkit = new VerovioToolkit(module);
  const scores = yield* bachChorales();
  const sequences = yield* Effect.forEach(scores, (score) => tokensOf(toolkit, score), {
    concurrency: 1,
  });
  const transitions = pipe(sequences, Arr.flatMap(transitionsIn), transitionsOf);
  const table: StyleTable = {
    name: "Bach chorales",
    source: BACH_SOURCE,
    order: ORDER,
    transitions,
  };
  return { table, scores: scores.length, contexts: Rec.size(transitions) };
});

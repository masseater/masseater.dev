import { Readable } from "node:stream";

import { parse } from "csv-parse";
import {
  Array as Arr,
  Effect,
  Order,
  Record as Rec,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";

import type { StyleTable } from "#/shared/lib/style-table.ts";

import { tokensOf } from "./chordonomicon.ts";

const FIRST = 1;
const ALL = "";
const NAME = "Chordonomicon";

export const CHORDONOMICON_SOURCE = "https://huggingface.co/datasets/ailsntua/Chordonomicon";

const taggedError = Schema.TaggedError;

export class UnreadableCorpus extends taggedError<
  UnreadableCorpus,
  { readonly brand: unique symbol }
>()("UnreadableCorpus", { message: Schema.String }, { identifier: "UnreadableCorpus" }) {}

export interface TableLimits {
  readonly order: number;
  readonly minCount: number;
}

interface Row {
  readonly chords: string;
  readonly main_genre: string;
}

type Counts = Map<string, Map<string, Map<string, number>>>;

const countInto = (counts: Counts, genre: string, tokens: readonly string[], order: number) => {
  const contexts = counts.get(genre) ?? new Map<string, Map<string, number>>();
  counts.set(genre, contexts);
  for (let index = FIRST; index < tokens.length; index += FIRST) {
    const next = tokens[index] ?? "";
    for (let length = FIRST; length <= Math.min(order, index); length += FIRST) {
      const context = tokens.slice(index - length, index).join(" ");
      const following = contexts.get(context) ?? new Map<string, number>();
      contexts.set(context, following);
      following.set(next, (following.get(next) ?? 0) + FIRST);
    }
  }
};

const byKey = Order.mapInput(Str.Order, ([key]: readonly [string, unknown]) => key);

const sortedRecord = <Value>(
  entries: readonly (readonly [string, Value])[],
): Readonly<Record<string, Value>> => Rec.fromEntries(Arr.sort(entries, byKey));

const tableOf =
  (counts: Counts, limits: TableLimits) =>
  (genre: string): StyleTable => ({
    name: genre === ALL ? NAME : `${NAME} ${genre}`,
    source: CHORDONOMICON_SOURCE,
    order: limits.order,
    transitions: sortedRecord(
      pipe(
        Arr.fromIterable(counts.get(genre) ?? new Map<string, Map<string, number>>()),
        Arr.map(
          ([context, following]) =>
            [
              context,
              sortedRecord(
                pipe(
                  Arr.fromIterable(following),
                  Arr.filter(([, count]) => count >= limits.minCount),
                ),
              ),
            ] as const,
        ),
        Arr.filter(([, following]) => !Rec.isEmptyRecord(following)),
      ),
    ),
  });

export interface GenreTables {
  readonly songs: number;
  readonly tables: readonly StyleTable[];
}

export const genreTablesOf = Effect.fn("genreTablesOf")(function* genreTablesOf<E>(
  bytes: Stream.Stream<Uint8Array, E>,
  limits: TableLimits,
) {
  const counts: Counts = new Map();
  const rows = Stream.fromAsyncIterable(
    Readable.fromWeb(yield* Stream.toReadableStreamEffect(bytes)).pipe(
      parse({ columns: true, relax_column_count: true }),
    ) as AsyncIterable<Row>,
    (cause) => UnreadableCorpus.make({ message: String(cause) }),
  );
  const songs = yield* Stream.runFold(
    rows,
    () => 0,
    (seen, row: Row) => {
      const tokens = tokensOf(row.chords);
      countInto(counts, ALL, tokens, limits.order);
      if (row.main_genre !== "") {
        countInto(counts, row.main_genre, tokens, limits.order);
      }
      return seen + FIRST;
    },
  );
  const genres = pipe(
    Arr.fromIterable(counts.keys()),
    Arr.filter((genre) => genre !== ALL),
    Arr.sort(Str.Order),
  );
  return {
    songs,
    tables: Arr.map([ALL, ...genres], tableOf(counts, limits)),
  } satisfies GenreTables;
});

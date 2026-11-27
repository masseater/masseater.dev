import {
  Array as Arr,
  Effect,
  Option,
  Record as Rec,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { Csv } from "effect/encoding";

import { sortedRecord } from "#/shared/lib/sorted-record.ts";
import type { StyleTable } from "#/shared/lib/style-table.ts";

import { tokensOf } from "./chordonomicon.ts";

const ONE = 1;
const NONE = 0;
const ALL = "all";
const NAME = "Chordonomicon";
const CHORDS = "chords";
const GENRE = "main_genre";

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

export interface GenreTable {
  readonly genre: string;
  readonly table: StyleTable;
}

export interface GenreTables {
  readonly songs: number;
  readonly tables: readonly GenreTable[];
}

interface Cell {
  count: number;
}

const nameOf = (genre: string): string =>
  pipe(
    genre,
    Option.liftPredicate((name) => name !== ALL),
    Option.match({ onNone: () => NAME, onSome: (name) => `${NAME} ${name}` }),
  );

interface Counter {
  readonly add: (genre: string, tokens: readonly string[]) => void;
  readonly tableOf: (genre: string) => GenreTable;
  readonly genres: () => readonly string[];
}

const counterOf = (limits: TableLimits): Counter => {
  const counts = new Map<string, Map<string, Map<string, Cell>>>();
  const add = (genre: string, tokens: readonly string[]): void => {
    const contexts = counts.getOrInsertComputed(genre, () => new Map());
    for (const index of Arr.drop(Arr.fromIterable(tokens.keys()), ONE)) {
      const next = Arr.getUnsafe(tokens, index);
      for (const length of Arr.range(ONE, Math.min(limits.order, index))) {
        const context = Arr.join(tokens.slice(index - length, index), " ");
        const following = contexts.getOrInsertComputed(context, () => new Map());
        following.getOrInsertComputed(next, () => ({ count: NONE })).count += ONE;
      }
    }
  };
  const keptOf = (
    following: ReadonlyMap<string, Readonly<Cell>>,
  ): Readonly<Record<string, number>> =>
    sortedRecord(
      pipe(
        Arr.fromIterable(following),
        Arr.filter(([, cell]) => cell.count >= limits.minCount),
        Arr.map(([next, cell]) => [next, cell.count] as const),
      ),
    );
  const contextsOf = (genre: string): readonly (readonly [string, Map<string, Cell>])[] =>
    Arr.fromIterable(counts.get(genre) ?? new Map<string, Map<string, Cell>>());
  const tableOf = (genre: string): GenreTable => ({
    genre,
    table: {
      name: nameOf(genre),
      source: CHORDONOMICON_SOURCE,
      order: limits.order,
      transitions: sortedRecord(
        pipe(
          contextsOf(genre),
          Arr.map(([context, following]) => [context, keptOf(following)] as const),
          Arr.filter(([, following]) => !Rec.isEmptyRecord(following)),
        ),
      ),
    },
  });
  const genres = (): readonly string[] =>
    pipe(
      Arr.fromIterable(counts.keys()),
      Arr.filter((genre) => genre !== ALL),
      Arr.sortBy(Str.Order),
    );
  return { add, tableOf, genres };
};

export const genreTablesOf = Effect.fn("genreTablesOf")(function* genreTablesOf<Failure>(
  bytes: Stream.Stream<Uint8Array, Failure>,
  limits: TableLimits,
) {
  const counter = counterOf(limits);
  const record = (row: Readonly<Record<string, string>>): void => {
    const tokens = tokensOf(
      pipe(
        Rec.get(row, CHORDS),
        Option.getOrElse(() => ""),
      ),
    );
    counter.add(ALL, tokens);
    for (const genre of Option.toArray(Rec.get(row, GENRE))) {
      if (genre !== "") {
        counter.add(genre, tokens);
      }
    }
  };
  const songs = yield* pipe(
    bytes,
    Stream.pipeThroughChannel(Csv.decode({ headers: true })),
    Stream.mapError((cause) => UnreadableCorpus.make({ message: String(cause) })),
    Stream.runFold(
      () => NONE,
      (seen: number, row: Readonly<Record<string, string>>): number => {
        record(row);
        return seen + ONE;
      },
    ),
  );
  return {
    songs,
    tables: pipe([ALL, ...counter.genres()], Arr.map(counter.tableOf)),
  } satisfies GenreTables;
});

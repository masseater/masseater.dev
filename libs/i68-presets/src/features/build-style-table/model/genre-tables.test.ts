import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Record as Rec, Stream, pipe } from "effect";

import type { Transitions } from "#/shared/lib/style-table.ts";

import { genreTablesOf } from "./genre-tables.ts";

const CSV = Arr.join(
  [
    "id,chords,release_date,genres,decade,rock_genre,artist_id,main_genre,spotify_song_id,spotify_artist_id",
    "1,<verse_1> C F G C,,,,,artist_1,pop,,",
    "2,<verse_1> G C D G,,,,,artist_2,pop,,",
    "3,<verse_1> C F G C F,,\"['rock', 'pop']\",,,artist_3,rock,,",
    "4,<verse_1> C Amin,,,,,artist_4,,,",
    "5,<verse_1> C,,,,,artist_5,jazz,,",
  ],
  "\n",
);

const LIMITS = { order: 2, minCount: 2 };

interface Change {
  readonly context: string;
  readonly chord: string;
  readonly count: number;
}

const changesOf = (transitions: Transitions): readonly Change[] =>
  pipe(
    Rec.toEntries(transitions),
    Arr.flatMap(([context, next]) =>
      pipe(
        Rec.toEntries(next),
        Arr.map(([chord, count]) => ({ context, chord, count })),
      ),
    ),
  );

describe("Chordonomicon genre tables", () => {
  it.effect("counts the changes of each main genre and of all songs together", () =>
    Effect.gen(function* tables() {
      const built = yield* genreTablesOf(Stream.make(new TextEncoder().encode(CSV)), LIMITS);
      expect({
        songs: built.songs,
        tables: pipe(
          built.tables,
          Arr.map(({ genre, table }) => [genre, table.name, changesOf(table.transitions)]),
        ),
      }).toStrictEqual({
        songs: 5,
        tables: [
          [
            "all",
            "Chordonomicon",
            [
              { context: "I", chord: "IV", count: 4 },
              { context: "I IV", chord: "V", count: 3 },
              { context: "IV", chord: "V", count: 3 },
              { context: "IV V", chord: "I", count: 3 },
              { context: "V", chord: "I", count: 3 },
            ],
          ],
          ["jazz", "Chordonomicon jazz", []],
          [
            "pop",
            "Chordonomicon pop",
            [
              { context: "I", chord: "IV", count: 2 },
              { context: "I IV", chord: "V", count: 2 },
              { context: "IV", chord: "V", count: 2 },
              { context: "IV V", chord: "I", count: 2 },
              { context: "V", chord: "I", count: 2 },
            ],
          ],
          ["rock", "Chordonomicon rock", [{ context: "I", chord: "IV", count: 2 }]],
        ],
      });
    }),
  );
});

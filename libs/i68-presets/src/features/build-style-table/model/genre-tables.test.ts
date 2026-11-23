import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";

import { genreTablesOf } from "./genre-tables.ts";

const CSV = [
  "id,chords,release_date,genres,decade,rock_genre,artist_id,main_genre,spotify_song_id,spotify_artist_id",
  "1,<verse_1> C F G C,,,,,artist_1,pop,,",
  "2,<verse_1> G C D G,,,,,artist_2,pop,,",
  "3,<verse_1> C F G C F,,,,,artist_3,rock,,",
  "4,<verse_1> C Amin,,,,,artist_4,,,",
].join("\n");

const LIMITS = { order: 2, minCount: 2 };

describe("Chordonomicon genre tables", () => {
  it.effect("counts the changes of each main genre and of all songs together", () =>
    Effect.gen(function* tables() {
      const built = yield* genreTablesOf(Stream.make(new TextEncoder().encode(CSV)), LIMITS);
      expect(built.songs).toBe(4);
      expect(built.tables.map((table) => [table.name, table.transitions])).toStrictEqual([
        [
          "Chordonomicon",
          {
            I: { IV: 4 },
            "I IV": { V: 3 },
            IV: { V: 3 },
            "IV V": { I: 3 },
            V: { I: 3 },
          },
        ],
        [
          "Chordonomicon pop",
          { I: { IV: 2 }, "I IV": { V: 2 }, IV: { V: 2 }, "IV V": { I: 2 }, V: { I: 2 } },
        ],
        ["Chordonomicon rock", { I: { IV: 2 } }],
      ]);
    }),
  );
});

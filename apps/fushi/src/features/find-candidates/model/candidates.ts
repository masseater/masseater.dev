import {
  BACH_TABLE,
  DEFAULT_LIMITS,
  StyleTableSchema,
  habitsOf,
  styleSongFromText,
} from "@r_masseater/i68-presets/habits";
import type { Habit, StyleTable, UnreadableSong } from "@r_masseater/i68-presets/habits";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { BACH } from "#/entities/library/index.ts";
import type { Song } from "#/entities/library/index.ts";
import { fetchBaselineText } from "#/shared/api/index.ts";
import type { CommandFailed } from "#/shared/api/index.ts";

export type Candidate = Habit & Readonly<{ key: string }>;

export type Found = Readonly<{ baseline: string; list: readonly Candidate[] }>;

export type FindFailure = CommandFailed | Schema.SchemaError | UnreadableSong;

const decodeTable = Schema.decodeEffect(Schema.fromJsonString(StyleTableSchema));

const baselineTable = (name: string): Effect.Effect<StyleTable, FindFailure> => {
  if (name === BACH) {
    return Effect.succeed(BACH_TABLE);
  }
  return fetchBaselineText(name).pipe(Effect.flatMap(decodeTable));
};

export const habitKey = (habit: Habit): string => `${habit.context} → ${habit.next}`;

const keyed = (habit: Habit): Candidate => ({ ...habit, key: habitKey(habit) });

export type Sources = Readonly<{ baseline: string; songs: readonly Song[] }>;

export const foundIn = ({ baseline, songs }: Sources): Effect.Effect<Found, FindFailure> =>
  Effect.all(
    {
      table: baselineTable(baseline),
      read: Effect.forEach(
        songs,
        (song) => styleSongFromText({ name: song.name, text: song.fumx }),
        { concurrency: 1 },
      ),
    },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ table, read }) => ({
      baseline: table.name,
      list: pipe(
        habitsOf({ songs: read, baseline: table, limits: DEFAULT_LIMITS }),
        Arr.map(keyed),
      ),
    })),
  );

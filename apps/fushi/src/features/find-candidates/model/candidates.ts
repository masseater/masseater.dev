import {
  BACH_TABLE,
  DEFAULT_LIMITS,
  StyleTableSchema,
  habitsOf,
  mixHabitsOf,
  styleSongFromText,
} from "@r_masseater/i68/habits";
import type {
  Habit,
  MixHabit,
  MixHabitFound,
  Place,
  StyleSong,
  StyleTable,
  Subject,
  UnreadableSong,
} from "@r_masseater/i68/habits";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { BACH } from "#/entities/library/index.ts";
import type { Song } from "#/entities/library/index.ts";
import { fetchBaselineText } from "#/shared/api/index.ts";
import type { CommandFailed } from "#/shared/api/index.ts";
import { AUTOMATION, HARMONY, MIX } from "#/shared/config/index.ts";

export type Shares = Readonly<{ share: number; baselineShare: number }>;

export type Candidate = Readonly<{
  key: string;
  category: string;
  subject: Subject;
  songs: number;
  count: number;
  evidence: readonly Place[];
  shares: Option.Option<Shares>;
}>;

export type Found = Readonly<{ baseline: string; list: readonly Candidate[] }>;

export type FindFailure = CommandFailed | Schema.SchemaError | UnreadableSong;

const decodeTable = Schema.decodeEffect(Schema.fromJsonString(StyleTableSchema));

const baselineTable = (name: string): Effect.Effect<StyleTable, FindFailure> => {
  if (name === BACH) {
    return Effect.succeed(BACH_TABLE);
  }
  return fetchBaselineText(name).pipe(Effect.flatMap(decodeTable));
};

const habitKey = (habit: Pick<Habit, "context" | "next">): string =>
  `${habit.context} → ${habit.next}`;

const chordCandidate = (habit: Habit): Candidate => ({
  key: habitKey(habit),
  category: HARMONY,
  subject: { type: "chord", context: habit.context, next: habit.next },
  songs: habit.songs,
  count: habit.count,
  evidence: habit.evidence,
  shares: Option.some({ share: habit.share, baselineShare: habit.baselineShare }),
});

const categoryOf = (habit: MixHabit): string => {
  if (habit.type === "move") {
    return AUTOMATION;
  }
  return MIX;
};

const mixCandidate = (found: MixHabitFound): Candidate => ({
  key: found.key,
  category: categoryOf(found.habit),
  subject: found.habit,
  songs: found.songs,
  count: found.count,
  evidence: found.evidence,
  shares: Option.none(),
});

export type Sources = Readonly<{ baseline: string; songs: readonly Song[] }>;

const listOf = (table: StyleTable, read: readonly StyleSong[]): readonly Candidate[] => [
  ...pipe(
    habitsOf({ songs: read, baseline: table, limits: DEFAULT_LIMITS }),
    Arr.map(chordCandidate),
  ),
  ...pipe(mixHabitsOf({ songs: read, minSongs: DEFAULT_LIMITS.songs }), Arr.map(mixCandidate)),
];

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
  ).pipe(Effect.map(({ table, read }) => ({ baseline: table.name, list: listOf(table, read) })));

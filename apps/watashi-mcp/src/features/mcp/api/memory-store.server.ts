import { and, desc, eq, like } from "drizzle-orm";
import { Array as Arr, Boolean as Bool, Effect, Option, Order, String as Str, pipe } from "effect";

import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { anyTermMatches, query, termsOf } from "./storage.server";

type MemoryQuery = Readonly<{ query: string; project: Option.Option<string>; limit: number }>;

const CANDIDATE_LIMIT = 200;

const NO_SCORE = 0;

const NAME_WEIGHT = 3;

const DESCRIPTION_WEIGHT = 2;

const CONTENT_WEIGHT = 1;

const weightOf = (text: string, term: string, weight: number): number =>
  Bool.match(Str.includes(Str.toLowerCase(term))(Str.toLowerCase(text)), {
    onFalse: () => NO_SCORE,
    onTrue: () => weight,
  });

const scoreOf =
  (terms: readonly string[]) =>
  (row: Memory): number =>
    Arr.reduce(
      terms,
      NO_SCORE,
      (score, term) =>
        score +
        weightOf(row.name, term, NAME_WEIGHT) +
        weightOf(row.description, term, DESCRIPTION_WEIGHT) +
        weightOf(row.content, term, CONTENT_WEIGHT),
    );

const inProject = (project: Option.Option<string>): Option.Option<ReturnType<typeof eq>> =>
  pipe(
    project,
    Option.map((name) => eq(memory.project, name)),
  );

const candidateLimit = (terms: readonly string[], limit: number): number =>
  Arr.match(terms, { onEmpty: () => limit, onNonEmpty: () => CANDIDATE_LIMIT });

const searchMemories = ({
  query: text,
  project,
  limit,
}: MemoryQuery): Effect.Effect<readonly Memory[], StorageFailed> => {
  const terms = termsOf(text);
  const conditions = [
    ...Option.toArray(inProject(project)),
    ...Option.toArray(
      anyTermMatches((pattern) => [
        like(memory.name, pattern),
        like(memory.description, pattern),
        like(memory.content, pattern),
      ])(terms),
    ),
  ];
  return query(() =>
    db
      .select()
      .from(memory)
      .where(and(...conditions))
      .orderBy(desc(memory.updatedAt))
      .limit(candidateLimit(terms, limit)),
  ).pipe(
    Effect.map((rows) =>
      pipe(rows, Arr.sortWith(scoreOf(terms), Order.flip(Order.Number)), Arr.take(limit)),
    ),
  );
};

export { searchMemories };
export type { MemoryQuery };

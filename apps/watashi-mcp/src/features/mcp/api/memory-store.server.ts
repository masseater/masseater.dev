import { and, desc, eq, like } from "drizzle-orm";
import {
  Array as Arr,
  Effect,
  Number as Num,
  Option,
  Order,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { timeOut } from "./life-time";
import { anyTermMatches, query, termsOf } from "./storage.server";

type MemoryQuery = Readonly<{ query: string; project: Option.Option<string>; limit: number }>;

type MemoryKey = Readonly<{ project: string; name: string }>;

type Body = Readonly<Record<string, unknown>>;

const CANDIDATE_LIMIT = 200;

const ONE_ROW = 1;

const NOT_RETRACTED = "";

const NAME_WEIGHT = 3;

const DESCRIPTION_WEIGHT = 2;

const CONTENT_WEIGHT = 1;

const NO_SCORE = 0;

const decodeEvidence = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Array(Schema.String)),
);

const evidenceOf = (row: Memory): readonly string[] =>
  pipe(
    decodeEvidence(row.evidence),
    Option.getOrElse((): readonly string[] => []),
  );

const memoryItem = (row: Memory): Body => ({
  ref: `memory:${row.id}`,
  store: "memory",
  project: row.project,
  name: row.name,
  description: row.description,
  content: row.content,
  evidence: evidenceOf(row),
  updatedAt: timeOut(row.updatedAt),
});

const weightOf =
  (term: string) =>
  (text: string, weight: number): number => {
    if (pipe(Str.toLowerCase(text), Str.includes(Str.toLowerCase(term)))) {
      return weight;
    }
    return NO_SCORE;
  };

const termScore =
  (row: Memory) =>
  (term: string): number => {
    const weigh = weightOf(term);
    return (
      weigh(row.name, NAME_WEIGHT) +
      weigh(row.description, DESCRIPTION_WEIGHT) +
      weigh(row.content, CONTENT_WEIGHT)
    );
  };

const scoreOf =
  (terms: readonly string[]) =>
  (row: Memory): number =>
    pipe(terms, Arr.map(termScore(row)), Num.sumAll);

const findMemory = ({
  project,
  name,
}: MemoryKey): Effect.Effect<Option.Option<Memory>, StorageFailed> =>
  query(() =>
    db
      .select()
      .from(memory)
      .where(and(eq(memory.project, project), eq(memory.name, name)))
      .limit(ONE_ROW),
  ).pipe(Effect.map(Arr.head));

const searchMemories = ({
  query: text,
  project,
  limit,
}: MemoryQuery): Effect.Effect<readonly Memory[], StorageFailed> => {
  const terms = termsOf(text);
  const conditions = [
    eq(memory.retractedAt, NOT_RETRACTED),
    ...pipe(
      project,
      Option.map((name) => eq(memory.project, name)),
      Option.toArray,
    ),
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
      .limit(CANDIDATE_LIMIT),
  ).pipe(
    Effect.map((rows) =>
      pipe(rows, Arr.sortWith(scoreOf(terms), Order.flip(Order.Number)), Arr.take(limit)),
    ),
  );
};

export { evidenceOf, findMemory, memoryItem, searchMemories };
export type { MemoryKey, MemoryQuery };

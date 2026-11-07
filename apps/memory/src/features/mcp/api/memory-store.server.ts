import { and, desc, eq, like, or } from "drizzle-orm";
import {
  Array as Arr,
  Boolean as Bool,
  DateTime,
  Effect,
  Option,
  Order,
  Predicate,
  String as Str,
  pipe,
} from "effect";

import { MemoryExists } from "#/features/mcp/model/memory-exists";
import { MemoryNotFound } from "#/features/mcp/model/memory-not-found";
import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

type MemoryKey = Readonly<{ project: string; name: string }>;

type NewMemory = MemoryKey & Readonly<{ description: string; content: string }>;

type MemoryChange = MemoryKey & Readonly<{ description?: string; content?: string }>;

type MemoryQuery = Readonly<{ query: string; project: Option.Option<string>; limit: number }>;

const CANDIDATE_LIMIT = 200;

const NO_SCORE = 0;

const NAME_WEIGHT = 3;

const DESCRIPTION_WEIGHT = 2;

const CONTENT_WEIGHT = 1;

const messageOf = (cause: unknown): string =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({ onNone: () => String(cause), onSome: (error) => error.message }),
  );

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, StorageFailed> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => StorageFailed.make({ message: messageOf(cause) }),
  });

const firstRow =
  <Failure>(onEmpty: () => Failure) =>
  (rows: readonly Memory[]): Effect.Effect<Memory, Failure> =>
    Effect.fromOption(Arr.head(rows)).pipe(Effect.mapError(onEmpty));

const nowIso = DateTime.now.pipe(Effect.map(DateTime.formatIso));

const saveMemory = (input: NewMemory): Effect.Effect<Memory, MemoryExists | StorageFailed> =>
  nowIso.pipe(
    Effect.flatMap((now) =>
      query(() =>
        db
          .insert(memory)
          .values({ ...input, createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning(),
      ),
    ),
    Effect.flatMap(
      firstRow(() => MemoryExists.make({ project: input.project, memoryName: input.name })),
    ),
  );

const updateMemory = ({
  project,
  name,
  ...change
}: MemoryChange): Effect.Effect<Memory, MemoryNotFound | StorageFailed> =>
  nowIso.pipe(
    Effect.flatMap((now) =>
      query(() =>
        db
          .update(memory)
          .set({ ...change, updatedAt: now })
          .where(and(eq(memory.project, project), eq(memory.name, name)))
          .returning(),
      ),
    ),
    Effect.flatMap(firstRow(() => MemoryNotFound.make({ project, memoryName: name }))),
  );

const termsOf = (text: string): readonly string[] =>
  pipe(text, Str.split(/\s+/u), Arr.filter(Str.isNonEmpty), Arr.dedupe);

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

const termMatches = (term: string): ReturnType<typeof like>[] => {
  const pattern = `%${term}%`;
  return [
    like(memory.name, pattern),
    like(memory.description, pattern),
    like(memory.content, pattern),
  ];
};

const anyTermMatches = (
  terms: readonly string[],
): Option.Option<NonNullable<ReturnType<typeof or>>> => {
  const matches = pipe(terms, Arr.flatMap(termMatches));
  return Option.fromNullishOr(or(...matches));
};

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
    ...Option.toArray(anyTermMatches(terms)),
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

export { saveMemory, searchMemories, updateMemory };
export type { MemoryChange, MemoryKey, MemoryQuery, NewMemory };

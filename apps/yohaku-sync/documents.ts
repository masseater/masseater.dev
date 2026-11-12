import type { Changes, SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import { env } from "cloudflare:workers";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import { Array, Effect, pipe } from "effect";

import { documents } from "./documents.table.ts";
import { StoreFailed } from "./store-failed.ts";

const PAGE_SIZE = 200;

const failed = (cause: unknown): StoreFailed =>
  StoreFailed.make({ message: globalThis.String(cause) });

const db = drizzle(env.DB);

const changesAfter = (after: number): Effect.Effect<typeof Changes.Type, StoreFailed> =>
  Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(documents)
        .where(gt(documents.revision, after))
        .orderBy(asc(documents.revision))
        .limit(PAGE_SIZE),
    catch: failed,
  }).pipe(
    Effect.map((rows) => ({
      documents: rows,
      more: rows.length === PAGE_SIZE,
    })),
  );

const replacing = ({ kind, id, updatedAt }: typeof SyncDocument.Type): BatchItem<"sqlite"> =>
  db
    .delete(documents)
    .where(and(eq(documents.kind, kind), eq(documents.id, id), lt(documents.updatedAt, updatedAt)));

const inserting = (document: typeof SyncDocument.Type): BatchItem<"sqlite"> =>
  db.insert(documents).values(document).onConflictDoNothing();

const store = (pushed: readonly (typeof SyncDocument.Type)[]): Effect.Effect<void, StoreFailed> =>
  pipe(
    pushed,
    Array.flatMap((document) => [replacing(document), inserting(document)]),
    Array.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (statements) =>
        Effect.tryPromise({ try: () => db.batch(statements), catch: failed }).pipe(Effect.asVoid),
    }),
  );

export { changesAfter, store };

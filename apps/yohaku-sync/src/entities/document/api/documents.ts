import type { Changes, SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array, Context, Effect, pipe } from "effect";

import { documents } from "#/entities/document/model/documents.table.ts";
import { StoreFailed } from "#/entities/document/model/store-failed.ts";

const PAGE_SIZE = 200;

export class DocumentsDb extends Context.Service<DocumentsDb, DrizzleD1Database>()(
  "yohaku-sync/entities/document/api/documents/DocumentsDb",
) {}

export const documentsDbOf = (binding: D1Database): DrizzleD1Database => drizzle(binding);

const failed = (cause: unknown): StoreFailed =>
  StoreFailed.make({ message: globalThis.String(cause) });

export const changesAfter = Effect.fn("changesAfter")(function* changesAfter(after: number) {
  const db = yield* DocumentsDb;
  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select()
        .from(documents)
        .where(gt(documents.revision, after))
        .orderBy(asc(documents.revision))
        .limit(PAGE_SIZE),
    catch: failed,
  });
  const page: typeof Changes.Type = { documents: rows, more: rows.length === PAGE_SIZE };
  return page;
});

const replacing =
  (db: DrizzleD1Database) =>
  ({ kind, id, updatedAt }: typeof SyncDocument.Type): BatchItem<"sqlite"> =>
    db
      .delete(documents)
      .where(
        and(eq(documents.kind, kind), eq(documents.id, id), lt(documents.updatedAt, updatedAt)),
      );

const inserting =
  (db: DrizzleD1Database) =>
  (document: typeof SyncDocument.Type): BatchItem<"sqlite"> =>
    db.insert(documents).values(document).onConflictDoNothing();

export const store = Effect.fn("store")(function* store(
  pushed: readonly (typeof SyncDocument.Type)[],
) {
  const db = yield* DocumentsDb;
  yield* pipe(
    pushed,
    Array.flatMap((document) => [replacing(db)(document), inserting(db)(document)]),
    Array.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (statements) =>
        Effect.tryPromise({ try: () => db.batch(statements), catch: failed }).pipe(Effect.asVoid),
    }),
  );
});

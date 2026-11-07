import { and, eq, max } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";

import { MemoryExists } from "#/features/mcp/model/memory-exists";
import { MemoryNotFound } from "#/features/mcp/model/memory-not-found";
import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { MemoryBodyValue } from "#/features/mcp/model/record-body";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { commit } from "./revision-writer.server";
import { firstRow, nextAfterMax, nowIso, query } from "./storage.server";

type MemoryKey = Readonly<{ project: string; name: string }>;

type MemoryChange = MemoryKey & Readonly<{ description?: string; content?: string }>;

type ChangeOp = "update" | "restore";

type Writer = Readonly<{ actor: string }>;

const FIRST_ID = 1;

const bodyOf = ({ project, name, description, content }: Memory): MemoryBodyValue => ({
  project,
  name,
  description,
  content,
});

const findMemory = ({ project, name }: MemoryKey): Effect.Effect<Memory[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(memory)
      .where(and(eq(memory.project, project), eq(memory.name, name)))
      .limit(FIRST_ID),
  );

const nextId: Effect.Effect<number, StorageFailed> = query(() =>
  db.select({ max: max(memory.id) }).from(memory),
).pipe(Effect.map(nextAfterMax));

const createMemory =
  ({ actor }: Writer) =>
  (input: MemoryBodyValue): Effect.Effect<Memory, MemoryExists | StorageFailed> =>
    Effect.gen(function* createMemoryRecord() {
      const existing = yield* findMemory(input);
      yield* Arr.match(existing, {
        onEmpty: () => Effect.void,
        onNonEmpty: () =>
          Effect.fail(MemoryExists.make({ project: input.project, memoryName: input.name })),
      });
      const now = yield* nowIso;
      const id = yield* nextId;
      const row: Memory = { id, ...input, createdAt: now, updatedAt: now };
      yield* commit({
        entity: "memory",
        entityId: String(id),
        op: "create",
        body: bodyOf(row),
        actor,
        at: now,
      })(db.insert(memory).values(row));
      return row;
    });

const changeMemory =
  ({ actor, op }: Writer & Readonly<{ op: ChangeOp }>) =>
  ({
    project,
    name,
    ...change
  }: MemoryChange): Effect.Effect<Memory, MemoryNotFound | StorageFailed> =>
    Effect.gen(function* changeMemoryRecord() {
      const current = yield* findMemory({ project, name }).pipe(
        Effect.flatMap(firstRow(() => MemoryNotFound.make({ project, memoryName: name }))),
      );
      const now = yield* nowIso;
      const next: Memory = { ...current, ...change, updatedAt: now };
      yield* commit({
        entity: "memory",
        entityId: String(current.id),
        op,
        body: bodyOf(next),
        actor,
        at: now,
      })(
        db
          .update(memory)
          .set({ ...change, updatedAt: now })
          .where(eq(memory.id, current.id)),
      );
      return next;
    });

export { changeMemory, createMemory };
export type { ChangeOp, MemoryChange, MemoryKey, Writer };

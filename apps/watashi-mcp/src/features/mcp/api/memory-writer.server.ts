import { eq, max } from "drizzle-orm";
import { Effect, Option, Schema } from "effect";

import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { RevisionOp } from "#/features/mcp/model/revision.table";
import type { StoreFailure } from "#/features/mcp/model/tool-failure";
import { db } from "#/shared/db/index.server";

import { evidenceOf } from "./memory-store.server";
import { commit } from "./revision-writer.server";
import { encodeJson, nextAfterMax, nowIso, query } from "./storage.server";

const MemorySnapshot = Schema.Struct({
  project: Schema.String,
  name: Schema.String,
  description: Schema.String,
  content: Schema.String,
  evidence: Schema.Array(Schema.String),
  retractedAt: Schema.String,
  retractReason: Schema.String,
});

type MemorySnapshotValue = typeof MemorySnapshot.Type;

type Writer = Readonly<{ actor: string }>;

type MemoryResult = Readonly<{ written: readonly string[]; notices: readonly never[] }>;

const NOT_RETRACTED = "";

const nextId = query(() => db.select({ max: max(memory.id) }).from(memory)).pipe(
  Effect.map(nextAfterMax),
);

const snapshotOf = (row: Memory): MemorySnapshotValue => ({
  project: row.project,
  name: row.name,
  description: row.description,
  content: row.content,
  evidence: evidenceOf(row),
  retractedAt: row.retractedAt,
  retractReason: row.retractReason,
});

const resultOf = (id: number): MemoryResult => ({ written: [`memory:${id}`], notices: [] });

const save =
  ({ writer, op }: Readonly<{ writer: Writer; op: RevisionOp }>) =>
  ({
    id,
    snapshot,
  }: Readonly<{ id: number; snapshot: MemorySnapshotValue }>): Effect.Effect<
    MemoryResult,
    StoreFailure
  > =>
    Effect.gen(function* saveMemory() {
      const now = yield* nowIso;
      const evidence = yield* encodeJson(snapshot.evidence);
      const row = { ...snapshot, evidence, updatedAt: now };
      const write = Option.match(
        Option.liftPredicate(op, (value) => value === "create"),
        {
          onNone: () => db.update(memory).set(row).where(eq(memory.id, id)),
          onSome: () => db.insert(memory).values({ ...row, id, createdAt: now }),
        },
      );
      const revision = { entity: "memory" as const, entityId: String(id), op, body: snapshot };
      yield* commit({ ...revision, actor: writer.actor, at: now })(write);
      return resultOf(id);
    });

export { MemorySnapshot, NOT_RETRACTED, nextId, resultOf, save, snapshotOf };
export type { MemoryResult, MemorySnapshotValue, Writer };

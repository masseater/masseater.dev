import { eq, max } from "drizzle-orm";
import { Effect, Option, Schema } from "effect";

import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { RevisionOp } from "#/features/mcp/model/revision.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { evidenceOf } from "./memory-store.server";
import { commit, numbered } from "./revision-writer.server";
import { attempt, encodeJson, nextAfterMax, nowIso } from "./storage.server";
import type { WriteFailure } from "./storage.server";

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

type Target = Readonly<{ writer: Writer; op: RevisionOp }>;

type Saved = Readonly<{ id: number; snapshot: MemorySnapshotValue }>;

type MemoryResult = Readonly<{ written: readonly string[]; notices: readonly never[] }>;

const NOT_RETRACTED = "";

const nextId: Effect.Effect<number, WriteFailure> = attempt(() =>
  db.select({ max: max(memory.id) }).from(memory),
).pipe(Effect.map(nextAfterMax));

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

const write =
  ({ writer, op }: Target) =>
  ({ id, snapshot }: Saved): Effect.Effect<MemoryResult, WriteFailure> =>
    Effect.gen(function* writeMemoryRow() {
      const now = yield* nowIso;
      const evidence = yield* encodeJson(snapshot.evidence);
      const row = { ...snapshot, evidence, updatedAt: now };
      const statement = Option.match(
        Option.liftPredicate(op, (value) => value === "create"),
        {
          onNone: () => db.update(memory).set(row).where(eq(memory.id, id)),
          onSome: () => db.insert(memory).values({ ...row, id, createdAt: now }),
        },
      );
      const revision = { entity: "memory" as const, entityId: String(id), op, body: snapshot };
      yield* commit({ ...revision, actor: writer.actor, at: now })(statement);
      return resultOf(id);
    });

const save =
  (target: Target) =>
  (saved: Saved): Effect.Effect<MemoryResult, StorageFailed> =>
    numbered(write(target)(saved));

const create =
  (writer: Writer) =>
  (snapshot: MemorySnapshotValue): Effect.Effect<MemoryResult, StorageFailed> =>
    nextId.pipe(
      Effect.flatMap((id) => write({ writer, op: "create" })({ id, snapshot })),
      numbered,
    );

export { MemorySnapshot, NOT_RETRACTED, create, save, snapshotOf };
export type { MemoryResult, MemorySnapshotValue, Saved, Target, Writer };

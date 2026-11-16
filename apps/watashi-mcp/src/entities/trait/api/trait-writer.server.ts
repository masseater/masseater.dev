import { eq, max } from "drizzle-orm";
import { Array as Arr, Effect, Option, Order, Record as Rec, pipe } from "effect";

import {
  db,
  commitWith,
  attempt,
  nextAfterMax,
  nowIso,
  toStorageFailed,
} from "#/shared/db/index.server.ts";
import type { RevisedWrite, Statement, WriteFailure } from "#/shared/db/index.server.ts";
import {
  ownerTrait,
  ownerTraitEvidence,
  ownerTraitVector,
  traitCursor,
} from "#/shared/db/index.ts";
import type { TraitOrigin, RevisionOp, StorageFailed } from "#/shared/db/index.ts";

import { keyText } from "./trait-state.ts";
import type { Plan, TraitKey, TraitState } from "./trait-state.ts";

export type Cursor = Readonly<{ origin: TraitOrigin; position: string }>;

export type VectorTexts = Readonly<Record<string, string>>;

export type Saving = Readonly<{ plan: Plan; vectors: VectorTexts; cursor: Cursor; actor: string }>;

type Stamp = Readonly<{
  idOf: (key: TraitKey) => number;
  vectors: VectorTexts;
  actor: string;
  at: string;
}>;

type TraitWrite = Readonly<{ revised: RevisedWrite; extra: readonly Statement[] }>;

const nextId: Effect.Effect<number, WriteFailure> = attempt(() =>
  db.select({ max: max(ownerTrait.id) }).from(ownerTrait),
).pipe(Effect.map(nextAfterMax));

const createdIndex = (trait: TraitState): readonly number[] => {
  if ("created" in trait.key) {
    return [trait.key.created];
  }
  return [];
};

const idsOf = (plan: Plan, first: number): ((key: TraitKey) => number) => {
  const created = pipe(
    plan.touched,
    Arr.flatMap(createdIndex),
    Arr.sortWith((index: number) => index, Order.Number),
  );
  return (key) => {
    if ("existing" in key) {
      return key.existing;
    }
    const offset = pipe(
      Arr.findFirstIndex(created, (index) => index === key.created),
      Option.getOrElse(() => created.length),
    );
    return first + offset;
  };
};

const opOf = (trait: TraitState): RevisionOp => {
  if ("created" in trait.key) {
    return "create";
  }
  if (trait.status === "retracted") {
    return "retract";
  }
  return "update";
};

const traitStatement = (
  trait: TraitState,
  id: number,
  row: typeof ownerTrait.$inferInsert,
): Statement => {
  if ("created" in trait.key) {
    return db.insert(ownerTrait).values({ ...row, id });
  }
  return db.update(ownerTrait).set(row).where(eq(ownerTrait.id, id));
};

const evidenceStatements = (trait: TraitState, id: number): readonly Statement[] => {
  const cleared = db.delete(ownerTraitEvidence).where(eq(ownerTraitEvidence.traitId, id));
  return Arr.match(trait.evidence, {
    onEmpty: () => [cleared],
    onNonEmpty: (items) => [
      cleared,
      db.insert(ownerTraitEvidence).values(
        pipe(
          items,
          Arr.map((item) => ({ ...item, traitId: id })),
        ),
      ),
    ],
  });
};

const vectorStatements = (
  trait: TraitState,
  id: number,
  { vectors, at }: Pick<Stamp, "vectors" | "at">,
): readonly Statement[] => {
  const cleared = db.delete(ownerTraitVector).where(eq(ownerTraitVector.traitId, id));
  return Option.match(Rec.get(vectors, keyText(trait.key)), {
    onNone: () => [cleared],
    onSome: (vector) => [
      cleared,
      db.insert(ownerTraitVector).values({ traitId: id, vector, updatedAt: at }),
    ],
  });
};

const writesOf =
  ({ idOf, vectors, actor, at }: Stamp) =>
  (trait: TraitState): TraitWrite => {
    const id = idOf(trait.key);
    const snapshot = {
      kind: trait.kind,
      scope: trait.scope,
      statement: trait.statement,
      why: trait.why,
      status: trait.status,
      supersededBy: pipe(trait.supersededBy, Option.map(idOf), Option.getOrNull),
    };
    return {
      revised: {
        record: {
          entity: "owner_trait",
          entityId: String(id),
          op: opOf(trait),
          body: { ...snapshot, evidence: trait.evidence },
          actor,
          at,
        },
        write: traitStatement(trait, id, { ...snapshot, createdAt: at, updatedAt: at }),
      },
      extra: [...evidenceStatements(trait, id), ...vectorStatements(trait, id, { vectors, at })],
    };
  };

const cursorWrite = (cursor: Cursor, at: string): Statement =>
  db
    .insert(traitCursor)
    .values({ ...cursor, updatedAt: at })
    .onConflictDoUpdate({
      target: traitCursor.origin,
      set: { position: cursor.position, updatedAt: at },
    });

const commitTraits = (
  writes: Arr.NonEmptyReadonlyArray<TraitWrite>,
  advance: Statement,
): Effect.Effect<void, WriteFailure> =>
  commitWith({
    writes: pipe(
      writes,
      Arr.map((item) => item.revised),
    ),
    extra: [
      ...pipe(
        writes,
        Arr.flatMap((item) => item.extra),
      ),
      advance,
    ],
  });

export const saveTraits = ({
  plan,
  vectors,
  cursor,
  actor,
}: Saving): Effect.Effect<void, StorageFailed> =>
  Effect.gen(function* saveTraitPlan() {
    const at = yield* nowIso;
    const first = yield* nextId;
    const stamp = { idOf: idsOf(plan, first), vectors, actor, at };
    const writes = pipe(plan.touched, Arr.map(writesOf(stamp)));
    const advance = cursorWrite(cursor, at);
    yield* Arr.match(writes, {
      onEmpty: () => attempt(() => db.batch([advance])).pipe(Effect.asVoid),
      onNonEmpty: (nonEmpty) => commitTraits(nonEmpty, advance),
    });
  }).pipe(Effect.mapError(toStorageFailed));

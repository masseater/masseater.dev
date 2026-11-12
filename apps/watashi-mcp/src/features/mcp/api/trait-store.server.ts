import { asc, eq } from "drizzle-orm";
import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import {
  ownerTrait,
  ownerTraitEvidence,
  ownerTraitJa,
  ownerTraitVector,
  traitCursor,
} from "#/features/mcp/model/owner-trait.table";
import type {
  OwnerTrait,
  OwnerTraitEvidence,
  TraitOrigin,
} from "#/features/mcp/model/owner-trait.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { query } from "./storage.server";
import { traitRefOf } from "./trait-state";
import type { Evidence, JaRows, TraitState } from "./trait-state";
import type { Vector } from "./trait-vector";

const ONE_ROW = 1;

const VectorJson = Schema.fromJsonString(Schema.Array(Schema.Finite));

const decodeVector = Schema.decodeUnknownOption(VectorJson);

const evidenceOf = (row: OwnerTraitEvidence): Evidence => ({
  source: row.source,
  quote: row.quote,
  stance: row.stance,
  scope: row.scope,
  observedAt: row.observedAt,
});

const stateOf =
  (evidence: readonly OwnerTraitEvidence[]) =>
  (row: OwnerTrait): TraitState => ({
    key: { existing: row.id },
    kind: row.kind,
    scope: row.scope,
    statement: row.statement,
    why: row.why,
    status: row.status,
    supersededBy: pipe(
      Option.fromNullishOr(row.supersededBy),
      Option.map((id) => ({ existing: id })),
    ),
    evidence: pipe(
      evidence,
      Arr.filter((item) => item.traitId === row.id),
      Arr.map(evidenceOf),
    ),
  });

const loadTraits: Effect.Effect<readonly TraitState[], StorageFailed> = Effect.gen(
  function* loadAllTraits() {
    const rows = yield* query(() => db.select().from(ownerTrait).orderBy(asc(ownerTrait.id)));
    const evidence = yield* query(() => db.select().from(ownerTraitEvidence));
    return pipe(rows, Arr.map(stateOf(evidence)));
  },
);

const loadTraitVectors: Effect.Effect<Readonly<Record<string, Vector>>, StorageFailed> = query(() =>
  db.select().from(ownerTraitVector),
).pipe(
  Effect.map((rows) =>
    Rec.fromEntries(
      pipe(
        rows,
        Arr.flatMap((row) =>
          pipe(
            decodeVector(row.vector),
            Option.map((vector) => [traitRefOf(row.traitId), vector] as const),
            Option.toArray,
          ),
        ),
      ),
    ),
  ),
);

const cursorOf = (origin: TraitOrigin): Effect.Effect<Option.Option<string>, StorageFailed> =>
  query(() =>
    db
      .select({ position: traitCursor.position })
      .from(traitCursor)
      .where(eq(traitCursor.origin, origin))
      .limit(ONE_ROW),
  ).pipe(
    Effect.map((rows) =>
      pipe(
        Arr.head(rows),
        Option.map((row) => row.position),
      ),
    ),
  );

const loadTraitJa: Effect.Effect<JaRows, StorageFailed> = query(() =>
  db.select().from(ownerTraitJa),
).pipe(
  Effect.map((rows) =>
    pipe(
      rows,
      Rec.fromIterableBy((row) => String(row.traitId)),
    ),
  ),
);

export { cursorOf, loadTraitJa, loadTraitVectors, loadTraits };

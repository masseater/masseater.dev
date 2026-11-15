import { Effect } from "effect";

import { ownerTraitJa } from "#/shared/db";
import type { OwnerTraitJa, StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

export const saveTraitJa = (row: OwnerTraitJa): Effect.Effect<void, StorageFailed> =>
  query(() =>
    db
      .insert(ownerTraitJa)
      .values(row)
      .onConflictDoUpdate({
        target: ownerTraitJa.traitId,
        set: {
          sourceStatement: row.sourceStatement,
          sourceWhy: row.sourceWhy,
          statement: row.statement,
          why: row.why,
          updatedAt: row.updatedAt,
        },
      }),
  ).pipe(Effect.asVoid);

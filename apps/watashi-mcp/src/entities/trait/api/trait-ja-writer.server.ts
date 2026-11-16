import { Effect } from "effect";

import { db, query } from "#/shared/db/index.server.ts";
import { ownerTraitJa } from "#/shared/db/index.ts";
import type { OwnerTraitJa, StorageFailed } from "#/shared/db/index.ts";

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

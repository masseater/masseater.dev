import { Effect } from "effect";

import { ownerTraitJa } from "#/features/mcp/model/owner-trait.table";
import type { OwnerTraitJa } from "#/features/mcp/model/owner-trait.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { query } from "./storage.server";

const saveTraitJa = (row: OwnerTraitJa): Effect.Effect<void, StorageFailed> =>
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

export { saveTraitJa };

import { Effect } from "effect";

import type { Database } from "#/shared/db/index.server.ts";
import { query } from "#/shared/db/index.server.ts";
import { ownerProfile } from "#/shared/db/index.ts";
import type { OwnerProfile, StorageFailed } from "#/shared/db/index.ts";

export type NewProfile = Omit<OwnerProfile, "id">;

export const saveProfile = (row: NewProfile): Effect.Effect<void, StorageFailed, Database> =>
  query((db) => db.insert(ownerProfile).values(row)).pipe(Effect.asVoid);

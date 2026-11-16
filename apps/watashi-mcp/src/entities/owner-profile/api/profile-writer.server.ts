import { Effect } from "effect";

import { db, query } from "#/shared/db/index.server.ts";
import { ownerProfile } from "#/shared/db/index.ts";
import type { OwnerProfile, StorageFailed } from "#/shared/db/index.ts";

export type NewProfile = Omit<OwnerProfile, "id">;

export const saveProfile = (row: NewProfile): Effect.Effect<void, StorageFailed> =>
  query(() => db.insert(ownerProfile).values(row)).pipe(Effect.asVoid);

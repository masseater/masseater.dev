import { Effect } from "effect";

import { ownerProfile } from "#/shared/db";
import type { OwnerProfile, StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

export type NewProfile = Omit<OwnerProfile, "id">;

export const saveProfile = (row: NewProfile): Effect.Effect<void, StorageFailed> =>
  query(() => db.insert(ownerProfile).values(row)).pipe(Effect.asVoid);

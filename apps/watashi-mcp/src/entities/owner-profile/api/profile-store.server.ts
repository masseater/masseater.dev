import { desc } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";
import type { Option } from "effect";

import { ownerProfile } from "#/shared/db";
import type { OwnerProfile, StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

const LATEST = 1;

export const latestProfile: Effect.Effect<Option.Option<OwnerProfile>, StorageFailed> = query(() =>
  db.select().from(ownerProfile).orderBy(desc(ownerProfile.id)).limit(LATEST),
).pipe(Effect.map(Arr.head));

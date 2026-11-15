import { and, eq, isNull } from "drizzle-orm";
import { Effect } from "effect";

import { apiToken } from "#/shared/db";
import type { ApiToken, StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

type NewApiToken = Omit<ApiToken, "revokedAt">;

type Revocation = Readonly<{ id: string; at: string }>;

const createApiToken = (row: NewApiToken): Effect.Effect<void, StorageFailed> =>
  query(() => db.insert(apiToken).values(row)).pipe(Effect.asVoid);

const revokeApiToken = ({
  id,
  at,
}: Revocation): Effect.Effect<readonly Pick<ApiToken, "id">[], StorageFailed> =>
  query(() =>
    db
      .update(apiToken)
      .set({ revokedAt: at })
      .where(and(eq(apiToken.id, id), isNull(apiToken.revokedAt)))
      .returning({ id: apiToken.id }),
  );

export { createApiToken, revokeApiToken };
export type { NewApiToken, Revocation };

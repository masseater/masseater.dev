import { and, desc, eq, isNull } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";
import type { Option } from "effect";

import { db, query } from "#/shared/db/index.server.ts";
import { apiToken } from "#/shared/db/index.ts";
import type { ApiToken, StorageFailed } from "#/shared/db/index.ts";

export type TokenSummary = Omit<ApiToken, "tokenHash">;

export const activeTokenByHash = (
  tokenHash: string,
): Effect.Effect<Option.Option<ApiToken>, StorageFailed> =>
  query(() =>
    db
      .select()
      .from(apiToken)
      .where(and(eq(apiToken.tokenHash, tokenHash), isNull(apiToken.revokedAt))),
  ).pipe(Effect.map(Arr.head));

export const listApiTokens: Effect.Effect<readonly TokenSummary[], StorageFailed> = query(() =>
  db
    .select({
      id: apiToken.id,
      scope: apiToken.scope,
      label: apiToken.label,
      createdAt: apiToken.createdAt,
      revokedAt: apiToken.revokedAt,
    })
    .from(apiToken)
    .orderBy(desc(apiToken.createdAt)),
);

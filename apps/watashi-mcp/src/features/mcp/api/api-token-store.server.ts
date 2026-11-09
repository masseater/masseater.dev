import { and, desc, eq, isNull } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";
import type { Option } from "effect";

import { apiToken } from "#/features/mcp/model/api-token.table";
import type { ApiToken } from "#/features/mcp/model/api-token.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { query } from "./storage.server";

type TokenSummary = Omit<ApiToken, "tokenHash">;

const activeTokenByHash = (
  tokenHash: string,
): Effect.Effect<Option.Option<ApiToken>, StorageFailed> =>
  query(() =>
    db
      .select()
      .from(apiToken)
      .where(and(eq(apiToken.tokenHash, tokenHash), isNull(apiToken.revokedAt))),
  ).pipe(Effect.map(Arr.head));

const listApiTokens: Effect.Effect<readonly TokenSummary[], StorageFailed> = query(() =>
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

export { activeTokenByHash, listApiTokens };
export type { TokenSummary };

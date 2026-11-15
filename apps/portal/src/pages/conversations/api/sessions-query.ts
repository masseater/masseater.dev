import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { SessionValue } from "#/entities/watashi";

export const loadConversationsPage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(watashiQueries.conversations.get.queryOptions());

export const useSessions = (): readonly SessionValue[] =>
  useSuspenseQuery(watashiQueries.conversations.get.queryOptions()).data.sessions;

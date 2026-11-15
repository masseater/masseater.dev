import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Option, Record as Rec, pipe } from "effect";

import { watashiQueries } from "#/entities/watashi";
import type { ConversationSearchValue, ConversationValue } from "#/entities/watashi";

type ConversationKey = Readonly<{ sessionId: string; search: ConversationSearchValue }>;

type ConversationLoad = ConversationKey & Readonly<{ queryClient: QueryClient }>;

const route = getRouteApi("/conversations/$session");

const cursorOf = (search: ConversationSearchValue): Readonly<{ cursor?: number }> =>
  pipe({ cursor: Option.fromUndefinedOr(search.cursor) }, Rec.getSomes);

export const loadConversationPage = ({
  queryClient,
  sessionId,
  search,
}: ConversationLoad): Promise<unknown> =>
  queryClient.query(watashiQueries.conversations({ sessionId }).get.queryOptions(cursorOf(search)));

export const useConversation = (): ConversationValue => {
  const { session: sessionId } = route.useParams();
  const search = route.useSearch();
  return useSuspenseQuery(
    watashiQueries.conversations({ sessionId }).get.queryOptions(cursorOf(search)),
  ).data;
};

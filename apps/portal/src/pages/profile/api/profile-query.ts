import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { ProfileValue } from "#/entities/watashi";

export const loadProfilePage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(watashiQueries.profile.get.queryOptions());

export const useProfile = (): ProfileValue =>
  useSuspenseQuery(watashiQueries.profile.get.queryOptions()).data;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { Effect, Option, pipe } from "effect";

import type { Entry } from "#/entities/entry";
import { toggleStar } from "#/features/star/model/star-state";
import type { StarState } from "#/features/star/model/star-state";

import { starQueries } from "./star-queries";

const ONLY_THIS_MUTATION = 1;

const toggled =
  (starred: boolean) =>
  (current: StarState | undefined): StarState | undefined =>
    pipe(Option.fromNullishOr(current), Option.map(toggleStar(starred)), Option.getOrUndefined);

const useStar = (
  entry: Entry,
): Readonly<{
  stars: UseQueryResult<StarState, unknown>;
  addStar: () => void;
  removeStar: () => void;
}> => {
  const queryClient = useQueryClient();
  const route = starQueries.api.stars({ category: entry.category })({ slug: entry.slug });
  const queryKey = route.get.queryKey();
  const stars = useQuery(route.get.queryOptions());
  const scope = { id: `stars/${entry.category}/${entry.slug}` };
  const isLast = (): boolean =>
    queryClient.isMutating({ mutationKey: route.put.mutationKey() }) +
      queryClient.isMutating({ mutationKey: route.delete.mutationKey() }) ===
    ONLY_THIS_MUTATION;
  const optimistic = (
    starred: boolean,
  ): Readonly<{
    scope: typeof scope;
    onMutate: () => Promise<unknown>;
    onSuccess: (data: StarState) => void;
    onError: () => void;
  }> => ({
    scope,
    onMutate: () =>
      Effect.runPromise(
        pipe(
          Effect.promise(() => queryClient.cancelQueries({ queryKey })),
          Effect.map(() => queryClient.setQueryData<StarState>(queryKey, toggled(starred))),
        ),
      ),
    onSuccess: (data) => {
      if (isLast()) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onError: () => {
      if (isLast()) {
        queryClient.setQueryData<StarState>(queryKey, toggled(!starred));
      }
    },
  });
  const add = useMutation(route.put.mutationOptions(optimistic(true)));
  const remove = useMutation(route.delete.mutationOptions(optimistic(false)));
  return { stars, addStar: add.mutate, removeStar: remove.mutate };
};

export { useStar };

import type { AssetKind, Package, SearchResult } from "@masseater.dev/aredoko-protocol";
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type {
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
  InfiniteData,
} from "@tanstack/react-query";
import { Array, Effect, Number, Option, String, pipe } from "effect";
import { useCallback } from "react";

import { useRefreshLibrary } from "#/features/library";
import {
  ASSETS_KEY,
  LIBRARY_POLL,
  PACKAGES_KEY,
  getPreview,
  linkBooth,
  listAssets,
  listPackages,
  search,
} from "#/shared/api";

const SEARCH_LIMIT = 120;
const PAGE_SIZE = 120;
const FIRST_PAGE = 0;

type Kind = typeof AssetKind.Type;

interface AssetPage {
  readonly assets: readonly (typeof SearchResult.Type)[];
  readonly total: number;
}

const usePackages = (): UseQueryResult<readonly (typeof Package.Type)[]> =>
  useQuery(
    queryOptions({
      queryKey: PACKAGES_KEY,
      queryFn: listPackages,
      ...LIBRARY_POLL,
    }),
  );

const usePackage = (id: Option.Option<number>): Option.Option<typeof Package.Type> => {
  const { data } = usePackages();
  return pipe(
    id,
    Option.flatMap((wanted) =>
      pipe(
        Option.fromUndefinedOr(data),
        Option.flatMap(Array.findFirst((candidate) => candidate.id === wanted)),
      ),
    ),
  );
};

const nextOffset = ({ total }: AssetPage, pages: readonly AssetPage[]): number | undefined => {
  const loaded = pipe(
    pages,
    Array.map(({ assets }) => assets.length),
    Number.sumAll,
  );
  return pipe(
    Option.some(loaded),
    Option.filter((count) => count < total),
    Option.getOrUndefined,
  );
};

const useAssets = ({
  packageId,
  kinds,
}: Readonly<{
  packageId: Option.Option<number>;
  kinds: readonly Kind[];
}>): UseInfiniteQueryResult<InfiniteData<AssetPage, number>> =>
  useInfiniteQuery(
    infiniteQueryOptions({
      queryKey: [...ASSETS_KEY, Option.getOrNull(packageId), kinds],
      queryFn: ({ pageParam }) =>
        listAssets({
          packageId: Option.getOrNull(packageId),
          kinds,
          offset: pageParam,
          limit: PAGE_SIZE,
        }),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextOffset,
      ...LIBRARY_POLL,
    }),
  );

const useLoadNext = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Readonly<{
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}>): (() => void) =>
  useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      Effect.runFork(Effect.promise(fetchNextPage));
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

const useSearch = ({
  query,
  kinds,
  packageId,
}: Readonly<{
  query: string;
  kinds: readonly Kind[];
  packageId: Option.Option<number>;
}>): UseQueryResult<readonly (typeof SearchResult.Type)[]> => {
  const enabled = String.isNonEmpty(String.trim(query));
  const scope = Option.getOrNull(packageId);
  return useQuery(
    queryOptions({
      queryKey: ["search", query, kinds, scope],
      queryFn: () => search({ query, kinds, limit: SEARCH_LIMIT, packageId: scope }),
      enabled,
    }),
  );
};

const usePreview = (assetId: number): UseQueryResult<string> =>
  useQuery(
    queryOptions({
      queryKey: ["preview", assetId],
      queryFn: () => getPreview(assetId),
      staleTime: globalThis.Number.POSITIVE_INFINITY,
    }),
  );

const useLinkBooth = (): UseMutationResult<
  typeof Package.Type,
  Error,
  Readonly<{ packageId: number; url: string }>
> => {
  const refresh = useRefreshLibrary();
  return useMutation({ mutationFn: linkBooth, onSuccess: refresh });
};

export type { AssetPage };
export { useAssets, useLinkBooth, useLoadNext, usePackage, usePackages, usePreview, useSearch };

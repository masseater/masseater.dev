import { getRouteApi } from "@tanstack/react-router";
import { Effect, Record } from "effect";
import { useCallback } from "react";

import type { RankingSearch } from "./search.ts";

const route = getRouteApi("/");

const FIRST_PAGE = 1;

export type Update = (change: Partial<RankingSearch>) => void;

export const useUpdateSearch = (): Update => {
  const navigate = route.useNavigate();
  return useCallback<Update>(
    (change) => {
      const search = (previous: RankingSearch): RankingSearch => ({
        ...previous,
        ...change,
        page: FIRST_PAGE,
      });
      Effect.runFork(Effect.promise(() => navigate({ search })));
    },
    [navigate],
  );
};

export const usePick = <Key extends keyof RankingSearch>({
  update,
  key,
}: Readonly<{ update: Update; key: Key }>): ((value: RankingSearch[Key]) => void) =>
  useCallback(
    (value: RankingSearch[Key]) => {
      update(Record.singleton(key, value));
    },
    [update, key],
  );

export const useRankingSearch = (): RankingSearch => route.useSearch();

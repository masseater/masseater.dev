import { run } from "@r_masseater/workers-tracing/effect";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Effect } from "effect";

import { slidesQueries } from "#/entities/slide/index.ts";
import type { HitValue } from "#/entities/slide/index.ts";
import { watashiQueries } from "#/entities/watashi/index.ts";
import type { LifeItemValue, MemoValue } from "#/entities/watashi/index.ts";

type SearchLoad = Readonly<{ queryClient: QueryClient; keyword: string }>;

const settle = (load: () => Promise<unknown>): Effect.Effect<unknown> =>
  Effect.promise(load).pipe(Effect.catchCause(() => Effect.void));

export const loadSearchPage = ({ queryClient, keyword }: SearchLoad): Promise<unknown> =>
  run(
    Effect.all(
      [
        settle(() => queryClient.query(watashiQueries.records.get.queryOptions({ keyword }))),
        settle(() => queryClient.query(watashiQueries.memos.get.queryOptions({ keyword }))),
        settle(() => queryClient.query(slidesQueries.search.get.queryOptions({ keyword }))),
      ],
      { concurrency: "unbounded" },
    ),
  );

export const useFoundRecords = (keyword: string): readonly LifeItemValue[] =>
  useSuspenseQuery(watashiQueries.records.get.queryOptions({ keyword })).data.items;

export const useFoundMemos = (keyword: string): readonly MemoValue[] =>
  useSuspenseQuery(watashiQueries.memos.get.queryOptions({ keyword })).data.items;

export const useFoundSlides = (keyword: string): readonly HitValue[] =>
  useSuspenseQuery(slidesQueries.search.get.queryOptions({ keyword })).data;

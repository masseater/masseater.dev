import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Option, String as Str, pipe } from "effect";

import { slidesQueries } from "#/entities/slide/index.ts";
import type { DeckValue, HitValue, SlidesSearchValue } from "#/entities/slide/index.ts";

type SlidesLoad = Readonly<{ queryClient: QueryClient; search: SlidesSearchValue }>;

export const wanted = (search: SlidesSearchValue): Option.Option<string> =>
  Option.filter(Option.fromUndefinedOr(search.keyword), Str.isNonEmpty);

export const loadSlidesPage = ({ queryClient, search }: SlidesLoad): Promise<unknown> =>
  pipe(
    wanted(search),
    Option.match({
      onNone: () => queryClient.query(slidesQueries.decks.get.queryOptions()),
      onSome: (keyword) => queryClient.query(slidesQueries.search.get.queryOptions({ keyword })),
    }),
  );

export const useDecks = (): readonly DeckValue[] =>
  useSuspenseQuery(slidesQueries.decks.get.queryOptions()).data;

export const useHits = (keyword: string): readonly HitValue[] =>
  useSuspenseQuery(slidesQueries.search.get.queryOptions({ keyword })).data;

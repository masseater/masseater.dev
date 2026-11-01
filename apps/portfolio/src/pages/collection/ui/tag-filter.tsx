import { getRouteApi } from "@tanstack/react-router";
import { Array, Effect, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { allTags } from "#/pages/collection/model/search";
import type { CollectionSearch } from "#/pages/collection/model/search";
import type { TagCount } from "#/pages/collection/model/tag-filter";

import { TagFilterButton } from "./tag-filter-button";

const route = getRouteApi("/_site/$category/");

const LABEL = "タグで絞り込む";

const ALL_LABEL = "すべて";

const TagFilter = ({
  activeTag,
  counts,
}: Readonly<{ activeTag: Option.Option<string>; counts: readonly TagCount[] }>): ReactNode => {
  const navigate = route.useNavigate();
  const select = useCallback(
    (search: CollectionSearch) => {
      Effect.runFork(Effect.promise(() => navigate({ search, resetScroll: false })));
    },
    [navigate],
  );
  return (
    <ul
      aria-label={LABEL}
      className="text-foreground/50 font-display xl:below-site-header-gap -mx-4 flex scrollbar-none gap-2 overflow-x-auto mask-r-from-85% px-4 py-1 text-xs xl:sticky xl:col-start-3 xl:row-start-1 xl:mx-0 xl:min-w-0 xl:flex-col xl:items-end xl:overflow-visible xl:mask-none xl:px-0"
    >
      <TagFilterButton active={Option.isNone(activeTag)} onSelect={select} search={allTags}>
        {ALL_LABEL}
      </TagFilterButton>
      {pipe(
        counts,
        Array.map(({ tag, count, search }) => (
          <TagFilterButton
            active={Option.contains(activeTag, tag)}
            key={tag}
            onSelect={select}
            search={search}
          >
            {`${tag} (${String(count)})`}
          </TagFilterButton>
        )),
      )}
    </ul>
  );
};

export { TagFilter };

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
      className="text-foreground/50 font-display flex flex-wrap gap-2 text-xs lg:sticky lg:top-8 lg:order-last lg:w-48 lg:shrink-0 lg:flex-col lg:items-start"
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

import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { TagFilter, tagCounts, useTagFilter, withTag } from "#/features/filter-by-tag/index.ts";
import { sectionMeta } from "#/shared/config/index.ts";

import { ReferenceItem } from "./reference-item.tsx";

const route = getRouteApi("/_stage/_site/sashi");

export const SashiPage = (): ReactNode => {
  const shelf = route.useLoaderData();
  const { activeTag, select } = useTagFilter({
    search: route.useSearch(),
    navigate: route.useNavigate(),
  });
  return (
    <div className="xl:collection-columns flex flex-col gap-8 xl:grid xl:items-start" data-wide>
      <h1 className="sr-only">{sectionMeta.sashi.title}</h1>
      <TagFilter activeTag={activeTag} counts={tagCounts(shelf)} onSelect={select} />
      <ul
        className="border-foreground/10 min-w-0 border-b xl:col-start-2 xl:row-start-1"
        role="list"
      >
        {pipe(
          withTag(activeTag)(shelf),
          Arr.map((item) => <ReferenceItem item={item} key={item.slug} />),
        )}
      </ul>
    </div>
  );
};

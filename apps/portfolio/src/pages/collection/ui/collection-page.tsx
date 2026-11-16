import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useStarCounts } from "#/features/star/index.ts";
import { useTagFilter } from "#/features/tag-filter/index.ts";

import { CollectionView } from "./collection-view.tsx";

const route = getRouteApi("/_stage/_site/$category/");

export const CollectionPage = (): ReactNode => {
  const { category, entries } = route.useLoaderData();
  const { activeTag, select } = useTagFilter({
    search: route.useSearch(),
    navigate: route.useNavigate(),
  });
  const starCounts = useStarCounts(category);
  return (
    <CollectionView
      activeTag={activeTag}
      category={category}
      entries={entries}
      onSelectTag={select}
      starCounts={starCounts}
    />
  );
};

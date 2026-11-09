import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useStarCounts } from "#/features/star";
import { useTagFilter } from "#/features/tag-filter";

import { CollectionView } from "./collection-view";

const route = getRouteApi("/_stage/_site/$category/");

const CollectionPage = (): ReactNode => {
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

export { CollectionPage };

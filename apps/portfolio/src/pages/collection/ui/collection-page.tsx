import { getRouteApi, useHydrated } from "@tanstack/react-router";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useStarCounts } from "#/pages/collection/api/use-star-counts";

import { CollectionView } from "./collection-view";

const route = getRouteApi("/_site/$category/");

const CollectionPage = (): ReactNode => {
  const { category, entries } = route.useLoaderData();
  const { tag } = route.useSearch();
  const hydrated = useHydrated();
  const activeTag = pipe(
    Option.fromUndefinedOr(tag),
    Option.filter(() => hydrated),
  );
  const starCounts = useStarCounts(category);
  return (
    <CollectionView
      activeTag={activeTag}
      category={category}
      entries={entries}
      starCounts={starCounts}
    />
  );
};

export { CollectionPage };

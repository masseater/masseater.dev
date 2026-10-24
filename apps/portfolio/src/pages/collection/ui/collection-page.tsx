import { getRouteApi, useHydrated } from "@tanstack/react-router";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

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
  return <CollectionView activeTag={activeTag} category={category} entries={entries} />;
};

export { CollectionPage };

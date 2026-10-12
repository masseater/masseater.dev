import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CollectionView } from "./collection-view";

const route = getRouteApi("/$category/");

const CollectionPage = (): ReactNode => {
  const { category, entries } = route.useLoaderData();
  return <CollectionView category={category} entries={entries} />;
};

export { CollectionPage };

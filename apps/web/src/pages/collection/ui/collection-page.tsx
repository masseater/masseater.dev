import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { entryQueries } from "#/entities/entry";
import { NotFound } from "#/widgets/not-found";

import { CollectionView } from "./collection-view";

const route = getRouteApi("/$category/");

const CollectionPage = (): ReactNode => {
  const { category } = route.useParams();
  const { data } = useSuspenseQuery(entryQueries.collection(category));
  if (data.status === "missing") {
    return <NotFound />;
  }
  return <CollectionView category={data.category} entries={data.entries} />;
};

export { CollectionPage };

import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CategoriesView } from "sloppedia";

import { wiki } from "#/shared/config";

const route = getRouteApi("/sloppedia/categories");

const CategoriesPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <CategoriesView articles={entries} config={wiki} />;
};

export { CategoriesPage };

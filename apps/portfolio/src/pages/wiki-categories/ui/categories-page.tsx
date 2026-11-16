import { CategoriesView } from "@masseater.dev/sloppedia";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { wiki } from "#/shared/wiki/index.ts";

const route = getRouteApi("/sloppedia/categories");

export const CategoriesPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <CategoriesView articles={entries} config={wiki} />;
};

import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CategoriesView } from "./categories-view";

const route = getRouteApi("/sloppedia/categories");

const CategoriesPage = (): ReactNode => <CategoriesView categories={route.useLoaderData()} />;

export { CategoriesPage };

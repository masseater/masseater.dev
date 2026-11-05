import { createFileRoute } from "@tanstack/react-router";

import { categoriesHead, CategoriesPage, loadCategories } from "#/pages/wiki-categories";

const Route = createFileRoute("/sloppedia/categories")({
  loader: loadCategories,
  head: () => categoriesHead,
  component: CategoriesPage,
});

export { Route };

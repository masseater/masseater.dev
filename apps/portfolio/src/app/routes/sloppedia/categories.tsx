import { createFileRoute } from "@tanstack/react-router";

import { categoriesHead, CategoriesPage, loadCategories } from "#/pages/wiki-categories";

export const Route = createFileRoute("/sloppedia/categories")({
  loader: loadCategories,
  head: () => categoriesHead,
  component: CategoriesPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { validateTagSearch } from "#/features/tag-filter/index.ts";
import { collectionHead, CollectionPage, loadCollection } from "#/pages/collection/index.ts";

export const Route = createFileRoute("/_stage/_site/$category/")({
  validateSearch: validateTagSearch,
  loader: ({ params: { category } }) => loadCollection(category),
  head: ({ loaderData }) => collectionHead(loaderData),
  component: CollectionPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { validateTagSearch } from "#/features/tag-filter";
import { collectionHead, CollectionPage, loadCollection } from "#/pages/collection";

const Route = createFileRoute("/_stage/_site/$category/")({
  validateSearch: validateTagSearch,
  loader: ({ params: { category } }) => loadCollection(category),
  head: ({ loaderData }) => collectionHead(loaderData),
  component: CollectionPage,
});

export { Route };

import { createFileRoute } from "@tanstack/react-router";

import {
  collectionHead,
  CollectionPage,
  loadCollection,
  validateCollectionSearch,
} from "#/pages/collection";

const Route = createFileRoute("/_site/$category/")({
  validateSearch: validateCollectionSearch,
  loader: ({ params: { category } }) => loadCollection(category),
  head: ({ loaderData }) => collectionHead(loaderData),
  component: CollectionPage,
});

export { Route };

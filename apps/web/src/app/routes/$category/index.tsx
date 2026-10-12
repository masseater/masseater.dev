import { createFileRoute } from "@tanstack/react-router";

import { collectionHead, CollectionPage, loadCollection } from "#/pages/collection";

const Route = createFileRoute("/$category/")({
  loader: ({ params: { category } }) => loadCollection(category),
  head: ({ loaderData }) => collectionHead(loaderData),
  component: CollectionPage,
});

export { Route };

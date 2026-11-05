import { createFileRoute } from "@tanstack/react-router";

import { articleHead, ArticlePage, loadArticle } from "#/pages/wiki-article";

const Route = createFileRoute("/sloppedia/$slug")({
  loader: ({ params }) => loadArticle(params),
  head: ({ loaderData }) => articleHead(loaderData),
  component: ArticlePage,
});

export { Route };

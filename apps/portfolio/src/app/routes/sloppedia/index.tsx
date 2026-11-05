import { createFileRoute } from "@tanstack/react-router";

import { loadArticles, mainHead, MainPage } from "#/pages/wiki-main";

const Route = createFileRoute("/sloppedia/")({
  loader: loadArticles,
  head: () => mainHead,
  component: MainPage,
});

export { Route };

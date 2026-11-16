import { createFileRoute } from "@tanstack/react-router";

import { loadArticles, mainHead, MainPage } from "#/pages/wiki-main/index.ts";

export const Route = createFileRoute("/sloppedia/")({
  loader: loadArticles,
  head: () => mainHead,
  component: MainPage,
});

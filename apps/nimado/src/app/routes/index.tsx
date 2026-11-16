import { createFileRoute } from "@tanstack/react-router";

import { RankingPage, rankingSearch } from "#/pages/ranking/index.ts";

export const Route = createFileRoute("/")({
  validateSearch: rankingSearch,
  component: RankingPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { RankingPage, rankingSearch } from "#/pages/ranking";

export const Route = createFileRoute("/")({
  validateSearch: rankingSearch,
  component: RankingPage,
});

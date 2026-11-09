import { createFileRoute } from "@tanstack/react-router";

import { RankingPage, rankingSearch } from "#/pages/ranking";

const Route = createFileRoute("/")({
  validateSearch: rankingSearch,
  component: RankingPage,
});

export { Route };

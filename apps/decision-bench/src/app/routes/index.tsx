import { createFileRoute } from "@tanstack/react-router";

import { LeaderboardPage } from "#/pages/leaderboard";

const Route = createFileRoute("/")({
  component: LeaderboardPage,
});

export { Route };

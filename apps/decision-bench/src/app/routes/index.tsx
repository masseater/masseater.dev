import { createFileRoute } from "@tanstack/react-router";

import { LeaderboardPage } from "#/pages/leaderboard/index.ts";

export const Route = createFileRoute("/")({
  component: LeaderboardPage,
});

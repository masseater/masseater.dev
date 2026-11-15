import { createFileRoute } from "@tanstack/react-router";

import { TaskPage } from "#/pages/leaderboard";

export const Route = createFileRoute("/tasks/$task")({
  component: TaskPage,
});

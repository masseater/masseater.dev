import { createFileRoute } from "@tanstack/react-router";

import { TaskPage } from "#/pages/leaderboard";

const Route = createFileRoute("/tasks/$task")({
  component: TaskPage,
});

export { Route };

import { createFileRoute } from "@tanstack/react-router";

import { TaskPage } from "#/pages/task";

export const Route = createFileRoute("/tasks/$task")({
  component: TaskPage,
});

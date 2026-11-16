import { createFileRoute } from "@tanstack/react-router";

import { TaskPage } from "#/pages/task/index.ts";

export const Route = createFileRoute("/tasks/$task")({
  component: TaskPage,
});

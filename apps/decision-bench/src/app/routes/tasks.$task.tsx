import { createFileRoute } from "@tanstack/react-router";

import { TaskPage } from "#/pages/task";

const Route = createFileRoute("/tasks/$task")({
  component: TaskPage,
});

export { Route };

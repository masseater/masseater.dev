import { createFileRoute } from "@tanstack/react-router";

import { SchedulesPage, loadSchedulesPage } from "#/pages/schedules/index.ts";

export const Route = createFileRoute("/schedules")({
  loader: ({ context }) => loadSchedulesPage(context.queryClient),
  component: SchedulesPage,
});

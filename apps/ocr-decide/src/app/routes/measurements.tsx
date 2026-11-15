import { createFileRoute } from "@tanstack/react-router";

import { MeasurementsPage, summaryQuery } from "#/pages/measurements";

export const Route = createFileRoute("/measurements")({
  loader: ({ context }) => context.queryClient.query(summaryQuery),
  component: MeasurementsPage,
});

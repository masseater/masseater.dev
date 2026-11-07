import { createFileRoute } from "@tanstack/react-router";

import { MeasurementsPage, summaryQuery } from "#/pages/measurements";

const Route = createFileRoute("/measurements")({
  loader: ({ context }) => context.queryClient.query(summaryQuery),
  component: MeasurementsPage,
});

export { Route };

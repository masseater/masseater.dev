import { createFileRoute } from "@tanstack/react-router";

import { TimelinePage, loadTimelinePage } from "#/pages/timeline";

export const Route = createFileRoute("/timeline")({
  loader: ({ context }) => loadTimelinePage(context.queryClient),
  component: TimelinePage,
});

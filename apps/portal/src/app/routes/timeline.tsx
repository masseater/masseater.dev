import { createFileRoute } from "@tanstack/react-router";

import { TimelinePage, loadTimelinePage } from "#/pages/timeline/index.ts";

export const Route = createFileRoute("/timeline")({
  loader: ({ context }) => loadTimelinePage(context.queryClient),
  component: TimelinePage,
});

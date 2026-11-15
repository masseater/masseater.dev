import { createFileRoute } from "@tanstack/react-router";

import { TimelinePage, loadTimelinePage } from "#/pages/timeline";

const Route = createFileRoute("/_watashi/")({
  loader: ({ context }) => loadTimelinePage(context.queryClient),
  component: TimelinePage,
});

export { Route };

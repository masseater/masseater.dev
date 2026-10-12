import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "#/app/shell/site-layout";

const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

export { Route };

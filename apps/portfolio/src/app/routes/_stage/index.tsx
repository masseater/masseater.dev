import { createFileRoute } from "@tanstack/react-router";

import { homeHead, HomePage } from "#/pages/home";

const Route = createFileRoute("/_stage/")({
  head: () => homeHead,
  component: HomePage,
});

export { Route };

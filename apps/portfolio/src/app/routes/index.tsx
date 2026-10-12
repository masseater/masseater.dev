import { createFileRoute } from "@tanstack/react-router";

import { homeHead, HomePage } from "#/pages/home";

const Route = createFileRoute("/")({
  head: () => homeHead,
  component: HomePage,
});

export { Route };

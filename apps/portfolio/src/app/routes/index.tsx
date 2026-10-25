import { createFileRoute } from "@tanstack/react-router";

import { homeHead, HomePage, loadHome } from "#/pages/home";

const Route = createFileRoute("/")({
  loader: loadHome,
  head: () => homeHead,
  component: HomePage,
});

export { Route };

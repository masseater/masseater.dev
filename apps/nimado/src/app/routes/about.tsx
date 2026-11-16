import { createFileRoute } from "@tanstack/react-router";

import { AboutPage } from "#/pages/about/index.ts";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "nimado について" }] }),
  component: AboutPage,
});

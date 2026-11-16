import { createFileRoute } from "@tanstack/react-router";

import { InspectPage } from "#/pages/inspect/index.ts";

export const Route = createFileRoute("/")({
  component: InspectPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { InspectPage } from "#/pages/inspect";

export const Route = createFileRoute("/")({
  component: InspectPage,
});

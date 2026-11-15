import { createFileRoute } from "@tanstack/react-router";

import { ExtractPage } from "#/pages/extract";

export const Route = createFileRoute("/")({
  component: ExtractPage,
});

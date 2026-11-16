import { createFileRoute } from "@tanstack/react-router";

import { ExtractPage } from "#/pages/extract/index.ts";

export const Route = createFileRoute("/")({
  component: ExtractPage,
});

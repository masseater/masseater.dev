import { createFileRoute } from "@tanstack/react-router";

import { ExtractPage } from "#/pages/extract";

const Route = createFileRoute("/")({
  component: ExtractPage,
});

export { Route };

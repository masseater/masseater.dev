import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage, validateConsentSearch } from "#/pages/consent/index.ts";

export const Route = createFileRoute("/consent")({
  validateSearch: validateConsentSearch,
  component: ConsentPage,
});

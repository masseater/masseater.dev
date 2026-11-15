import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage, validateConsentSearch } from "#/pages/consent";

export const Route = createFileRoute("/consent")({
  validateSearch: validateConsentSearch,
  component: ConsentPage,
});

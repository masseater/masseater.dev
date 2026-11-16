import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage, validateConsentSearch } from "#/pages/mcp-consent/index.ts";

export const Route = createFileRoute("/mcp_/consent")({
  validateSearch: validateConsentSearch,
  component: ConsentPage,
});

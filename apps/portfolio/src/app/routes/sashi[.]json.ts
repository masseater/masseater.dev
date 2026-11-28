import { createFileRoute } from "@tanstack/react-router";

import { referencesResponse } from "#/entities/reference/index.server.ts";

export const Route = createFileRoute("/sashi.json")({
  server: { handlers: { GET: referencesResponse } },
});

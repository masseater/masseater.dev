import { createFileRoute } from "@tanstack/react-router";

import { feedResponse } from "#/entities/entry/index.server.ts";

export const Route = createFileRoute("/feed.xml")({
  server: { handlers: { GET: feedResponse } },
});

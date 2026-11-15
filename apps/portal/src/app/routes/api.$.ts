import { routeHandlers } from "@r_masseater/workers-tracing/elysia";
import { createFileRoute } from "@tanstack/react-router";

import { api } from "#/app/server/api.server.ts";

export const Route = createFileRoute("/api/$")({
  server: { handlers: routeHandlers(api.handle) },
});

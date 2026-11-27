import { routeHandlers } from "@r_masseater/workers-tracing/elysia";
import { createFileRoute } from "@tanstack/react-router";

import { handleApi } from "#/app/server/api.server.ts";

export const Route = createFileRoute("/api/$")({
  server: { handlers: routeHandlers(handleApi) },
});

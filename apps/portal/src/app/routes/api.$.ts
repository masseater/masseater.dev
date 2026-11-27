import { routeHandlers } from "@r_masseater/workers-tracing/elysia";
import { createFileRoute } from "@tanstack/react-router";

import { handleApi } from "#/app/server/api.server.ts";
import { sameOriginWrites } from "#/shared/api/index.server.ts";

export const Route = createFileRoute("/api/$")({
  server: { middleware: [sameOriginWrites], handlers: routeHandlers(handleApi) },
});

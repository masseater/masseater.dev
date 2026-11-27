import { authHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { handleAuth } from "#/app/mcp/index.server.ts";

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: authHandlers(handleAuth) },
});

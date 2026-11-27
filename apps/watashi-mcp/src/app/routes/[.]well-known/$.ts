import { wellKnownHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { handleAuth } from "#/app/mcp/index.server.ts";

export const Route = createFileRoute("/.well-known/$")({
  server: { handlers: wellKnownHandlers(handleAuth) },
});

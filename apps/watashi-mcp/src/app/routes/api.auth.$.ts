import { authHandlers, floodGuarded } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { createAuth } from "#/shared/auth/index.server.ts";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: authHandlers(
      floodGuarded(env.AUTH_LIMITER)((request) => createAuth().handler(request)),
    ),
  },
});

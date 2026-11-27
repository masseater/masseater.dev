import { floodGuarded } from "@masseater.dev/owner-auth/server";
import { env } from "cloudflare:workers";

import { createAuth } from "#/shared/auth/index.server.ts";

export const handleAuth = floodGuarded(env.AUTH_LIMITER)((request) =>
  createAuth(env).handler(request),
);

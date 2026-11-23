import { floodGuarded } from "@masseater.dev/owner-auth/server";
import { env } from "cloudflare:workers";

import { catalogRoutes } from "#/entities/catalog/index.server.ts";
import { createRouter } from "#/shared/api/index.server.ts";
import { createAuth } from "#/shared/auth/index.server.ts";

export const api = createRouter("")
  .mount(floodGuarded(env.AUTH_LIMITER)((request) => createAuth().handler(request)))
  .use(catalogRoutes);

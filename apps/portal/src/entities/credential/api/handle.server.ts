import { env } from "cloudflare:workers";

import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

import { credentialsRoutes } from "./credentials-routes.server.ts";

export const handleCredentials = servingUpstreams(env)(
  createRouter("").use(credentialsRoutes).handle,
);

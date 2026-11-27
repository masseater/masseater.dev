import { env } from "cloudflare:workers";

import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

import { watashiRoutes } from "./watashi-routes.server.ts";

export const handleWatashi = servingUpstreams(env)(createRouter("").use(watashiRoutes).handle);

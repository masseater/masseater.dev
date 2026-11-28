import { env } from "cloudflare:workers";

import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

import { schedulesRoutes } from "./schedules-routes.server.ts";

export const handleSchedules = servingUpstreams(env)(createRouter("").use(schedulesRoutes).handle);

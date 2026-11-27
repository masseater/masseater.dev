import { env } from "cloudflare:workers";

import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

import { slidesRoutes } from "./slides-routes.server.ts";

export const handleSlides = servingUpstreams(env)(createRouter("").use(slidesRoutes).handle);

import { env } from "cloudflare:workers";

import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

import { moneyRoutes } from "./money-routes.server.ts";

export const handleMoney = servingUpstreams(env)(createRouter("").use(moneyRoutes).handle);

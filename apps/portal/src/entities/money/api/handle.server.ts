import { createRouter } from "#/shared/api/index.server.ts";

import { moneyRoutes } from "./money-routes.server.ts";

export const handleMoney = createRouter("").use(moneyRoutes).handle;

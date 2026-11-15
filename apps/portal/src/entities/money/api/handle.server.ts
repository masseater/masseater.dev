import { createRouter } from "#/shared/api/index.server";

import { moneyRoutes } from "./money-routes.server";

const handleMoney = createRouter("").use(moneyRoutes).handle;

export { handleMoney };

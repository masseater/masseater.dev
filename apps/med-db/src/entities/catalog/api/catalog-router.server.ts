import { createRouter } from "#/shared/api/index.server.ts";

import { catalogRoutes } from "./routes.server.ts";

export const catalogRouter = createRouter("").use(catalogRoutes).handle;

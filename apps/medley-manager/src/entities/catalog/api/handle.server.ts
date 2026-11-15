import { createRouter } from "#/shared/api/index.server.ts";

import { catalogRoutes } from "./routes.server";

export const handleCatalog = createRouter("").use(catalogRoutes).handle;

import { createRouter } from "#/shared/api/index.server";

import { catalogRoutes } from "./routes.server";

export const handleCatalog = createRouter("").use(catalogRoutes).handle;

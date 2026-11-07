import { createRouter } from "#/shared/api/index.server";

import { catalogRoutes } from "./routes.server";

const handleCatalog = createRouter("").use(catalogRoutes).handle;

export { handleCatalog };

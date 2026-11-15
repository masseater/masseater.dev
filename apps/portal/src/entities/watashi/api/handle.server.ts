import { createRouter } from "#/shared/api/index.server";

import { watashiRoutes } from "./watashi-routes.server";

const handleWatashi = createRouter("").use(watashiRoutes).handle;

export { handleWatashi };

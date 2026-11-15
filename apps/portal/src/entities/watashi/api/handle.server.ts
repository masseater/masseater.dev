import { createRouter } from "#/shared/api/index.server";

import { watashiRoutes } from "./watashi-routes.server";

export const handleWatashi = createRouter("").use(watashiRoutes).handle;

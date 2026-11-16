import { createRouter } from "#/shared/api/index.server.ts";

import { watashiRoutes } from "./watashi-routes.server.ts";

export const handleWatashi = createRouter("").use(watashiRoutes).handle;

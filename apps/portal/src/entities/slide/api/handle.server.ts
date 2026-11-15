import { createRouter } from "#/shared/api/index.server.ts";

import { slidesRoutes } from "./slides-routes.server";

export const handleSlides = createRouter("").use(slidesRoutes).handle;

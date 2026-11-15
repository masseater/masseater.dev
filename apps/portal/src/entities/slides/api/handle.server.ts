import { createRouter } from "#/shared/api/index.server";

import { slidesRoutes } from "./slides-routes.server";

const handleSlides = createRouter("").use(slidesRoutes).handle;

export { handleSlides };

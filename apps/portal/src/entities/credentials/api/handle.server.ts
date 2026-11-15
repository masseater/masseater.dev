import { createRouter } from "#/shared/api/index.server";

import { credentialsRoutes } from "./credentials-routes.server";

const handleCredentials = createRouter("").use(credentialsRoutes).handle;

export { handleCredentials };

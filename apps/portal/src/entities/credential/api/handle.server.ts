import { createRouter } from "#/shared/api/index.server.ts";

import { credentialsRoutes } from "./credentials-routes.server";

export const handleCredentials = createRouter("").use(credentialsRoutes).handle;

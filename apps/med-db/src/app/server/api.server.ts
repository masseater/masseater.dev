import { env } from "cloudflare:workers";

import { catalogRoutes } from "#/entities/catalog/index.server.ts";
import { createRouter, servingCatalog } from "#/shared/api/index.server.ts";
import { catalogDbOf } from "#/shared/db/index.server.ts";

import { handleAuth } from "./auth.server.ts";

const api = createRouter("").mount(handleAuth).use(catalogRoutes);

export const handleApi = servingCatalog(catalogDbOf(env.DB))(api.handle);

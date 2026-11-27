import { env } from "cloudflare:workers";

import { servingCatalog } from "#/shared/api/index.server.ts";
import { catalogDbOf } from "#/shared/db/index.server.ts";

import { catalogRouter } from "./catalog-router.server.ts";

export const handleCatalog = servingCatalog(catalogDbOf(env.DB))(catalogRouter);

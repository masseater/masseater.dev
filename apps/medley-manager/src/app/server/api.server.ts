import { catalogRoutes } from "#/entities/catalog/index.server.ts";
import { createRouter } from "#/shared/api/index.server.ts";
import { createAuth } from "#/shared/auth/index.server.ts";

export const api = createRouter("")
  .mount((request: Request) => createAuth().handler(request))
  .use(catalogRoutes);

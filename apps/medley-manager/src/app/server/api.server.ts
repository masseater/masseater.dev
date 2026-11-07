import { catalogRoutes } from "#/entities/catalog/index.server";
import { createRouter } from "#/shared/api/index.server";
import { createAuth } from "#/shared/auth/index.server";

export const api = createRouter("")
  .mount((request: Request) => createAuth().handler(request))
  .use(catalogRoutes);

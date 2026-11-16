import { credentialsRoutes } from "#/entities/credential/index.server.ts";
import { moneyRoutes } from "#/entities/money/index.server.ts";
import { slidesRoutes } from "#/entities/slide/index.server.ts";
import { watashiRoutes } from "#/entities/watashi/index.server.ts";
import { createRouter } from "#/shared/api/index.server.ts";

export const api = createRouter("")
  .use(watashiRoutes)
  .use(moneyRoutes)
  .use(slidesRoutes)
  .use(credentialsRoutes);

import { credentialsRoutes } from "#/entities/credential/index.server";
import { moneyRoutes } from "#/entities/money/index.server";
import { slidesRoutes } from "#/entities/slide/index.server";
import { watashiRoutes } from "#/entities/watashi/index.server";
import { createRouter } from "#/shared/api/index.server";

export const api = createRouter("")
  .use(watashiRoutes)
  .use(moneyRoutes)
  .use(slidesRoutes)
  .use(credentialsRoutes);

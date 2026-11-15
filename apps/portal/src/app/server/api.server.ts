import { credentialsRoutes } from "#/entities/credentials/index.server";
import { moneyRoutes } from "#/entities/money/index.server";
import { slidesRoutes } from "#/entities/slides/index.server";
import { watashiRoutes } from "#/entities/watashi/index.server";
import { createRouter } from "#/shared/api/index.server";

const api = createRouter("")
  .use(watashiRoutes)
  .use(moneyRoutes)
  .use(slidesRoutes)
  .use(credentialsRoutes);

export { api };

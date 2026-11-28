import { env } from "cloudflare:workers";

import { credentialsRoutes } from "#/entities/credential/index.server.ts";
import { moneyRoutes } from "#/entities/money/index.server.ts";
import { schedulesRoutes } from "#/entities/schedule/index.server.ts";
import { slidesRoutes } from "#/entities/slide/index.server.ts";
import { watashiRoutes } from "#/entities/watashi/index.server.ts";
import { createRouter, servingUpstreams } from "#/shared/api/index.server.ts";

const api = createRouter("")
  .use(watashiRoutes)
  .use(moneyRoutes)
  .use(slidesRoutes)
  .use(credentialsRoutes)
  .use(schedulesRoutes);

export const handleApi = servingUpstreams(env)(api.handle);

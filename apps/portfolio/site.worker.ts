import { env } from "cloudflare:workers";

import { starRoutes } from "#/pages/entry/index.server";
import { site } from "#/shared/config";

const worker = {
  fetch: (request: Request): Promise<Response> | Response => {
    if (new URL(request.url).pathname.startsWith(`${site.starsApiPath}/`)) {
      return starRoutes.handle(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;

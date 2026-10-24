import { env } from "cloudflare:workers";
import { String as Str } from "effect";

import { starRoutes } from "#/pages/entry/index.server";
import { site } from "#/shared/config";

const worker = {
  fetch: (request: Request): Promise<Response> | Response => {
    if (Str.startsWith(`${site.starsApiPath}/`)(new URL(request.url).pathname)) {
      return starRoutes.handle(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;

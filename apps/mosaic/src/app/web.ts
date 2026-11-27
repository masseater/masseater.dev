import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#/shared/config/index.ts";

const receiveSpans = browserSpans({ service: TELEMETRY_SERVICE });

const worker = {
  fetch: (
    request: Request,
    env: Readonly<{ ASSETS: Readonly<Pick<Fetcher, "fetch">> }>,
  ): Promise<Response> => {
    if (new URL(request.url).pathname === TRACES_PATH) {
      return receiveSpans(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;

import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#telemetry";

type WebEnv = Readonly<{ ASSETS: Readonly<Pick<Fetcher, "fetch">> }>;

const receiveSpans = browserSpans({ service: TELEMETRY_SERVICE });

const worker = {
  fetch: (request: Request, env: WebEnv): Promise<Response> => {
    if (new URL(request.url).pathname === TRACES_PATH) {
      return receiveSpans(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;

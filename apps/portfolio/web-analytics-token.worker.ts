import type { WebAnalyticsTokenEnv } from "./web-analytics-reader.ts";

const worker = {
  fetch: (_request: Request, env: WebAnalyticsTokenEnv): Response =>
    new Response(env.WEB_ANALYTICS_TOKEN, { headers: { "cache-control": "no-store" } }),
};

export default worker;

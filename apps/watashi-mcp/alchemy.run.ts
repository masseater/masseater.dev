import { AnalyticsEngine, D1, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { tracedProviders } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { name: `${PREFIX}db`, migrations: "./drizzle" });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.some(`${PREFIX}web`),
    bindings: { DB, TOOL_CALLS },
  });
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  {
    providers: tracedProviders(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const site = yield* web;
    yield* requireAppPrefix;
    return { url: site.url, mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);

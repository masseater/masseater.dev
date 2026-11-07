import { AnalyticsEngine, D1, Website, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack, makeRandom } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, TRACE_DESTINATION, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { name: `${PREFIX}db`, migrations: "./drizzle" });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  return yield* Website.Vite("Web", {
    name: `${PREFIX}web`,
    compatibility: { flags: ["global_fetch_strictly_public"] },
    logpush: true,
    domain: SITE_HOST,
    env: { BETTER_AUTH_SECRET, DB, TOOL_CALLS },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
  });
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  {
    providers: withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const site = yield* web;
    yield* requireAppPrefix;
    return { url: site.url, mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);

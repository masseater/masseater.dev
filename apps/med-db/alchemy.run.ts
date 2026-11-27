import { AnalyticsEngine } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { japanDatabase } from "@masseater.dev/cloudflare-account/japan-database";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { MCP_URL, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const CF_BEACON_TOKEN = "ad561fe157a84abb89c547d547524e9f";

const web = Effect.gen(function* web() {
  const DB = yield* japanDatabase("DB", { migrations: "./drizzle", name: Option.none() });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.none(),
    cpuMs: 3500,
    bindings: { CF_BEACON_TOKEN, DB, TOOL_CALLS },
  });
});

export type WebEnv = InferEnv<typeof web>;

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* web;
    yield* requireAppPrefix;
    return { url, mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);

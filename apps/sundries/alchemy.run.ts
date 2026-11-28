import { AnalyticsEngine, CloudflareEnvironment, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { JAPAN_PLACEMENT } from "@masseater.dev/cloudflare-account/japan";
import { japanDatabase } from "@masseater.dev/cloudflare-account/japan-database";
import { ownerMcpAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { upstreams } from "./alchemy.upstreams.ts";
import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { MCP_URL, SERVER_NAME, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const ownerAccess = Effect.gen(function* ownerAccess() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const access = yield* ownerMcpAccess({
    id: "McpAccess",
    name: `${PREFIX}access`,
    host: SITE_HOST,
    portalServerId: SERVER_NAME,
  });
  return { CLOUDFLARE_ACCOUNT_ID: accountId, ...access };
});

const worker = Effect.gen(function* worker() {
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const CLAUDE_REQUESTS = yield* japanDatabase("ClaudeRequests", {
    migrations: "./migrations",
    name: Option.none(),
  });
  return yield* Workers.Worker("Mcp", {
    limits: { cpuMs: 200 },
    name: `${PREFIX}worker`,
    main: "./src/app/sundries.ts",
    logpush: true,
    placement: JAPAN_PLACEMENT,
    domain: SITE_HOST,
    workersDev: false,
    crons: ["* * * * *"],
    env: {
      TOOL_CALLS,
      CLAUDE_REQUESTS,
      AI: Workers.AI(),
      ...(yield* ownerAccess),
      ...(yield* upstreams),
    },
  });
});

export type WorkerEnv = InferEnv<typeof worker>;

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* worker;
    yield* requireAppPrefix;
    return { mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);

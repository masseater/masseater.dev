import { AnalyticsEngine, D1, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerMcpAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SERVER_NAME, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const worker = Effect.gen(function* worker() {
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const LEDGER = yield* D1.Database("Ledger", { migrations: "./migrations" }).pipe(
    RemovalPolicy.protect(),
  );
  const access = yield* ownerMcpAccess({
    id: "McpAccess",
    name: `${PREFIX}access`,
    host: SITE_HOST,
    portalServerId: SERVER_NAME,
  });
  return yield* Workers.Worker("Mcp", {
    name: `${PREFIX}worker`,
    main: "./src/app/money.worker.ts",
    logpush: true,
    domain: SITE_HOST,
    workersDev: false,
    env: {
      TOOL_CALLS,
      LEDGER,
      ACCESS_TEAM_DOMAIN: access.ACCESS_TEAM_DOMAIN,
      ACCESS_AUDIENCE: access.ACCESS_AUDIENCE,
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

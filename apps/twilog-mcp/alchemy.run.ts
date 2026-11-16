import { AnalyticsEngine, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerMcpAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import type { AccessOAuth } from "@masseater.dev/repositories/credential-broker.worker";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { MCP_URL, SERVER_NAME, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const worker = Effect.gen(function* worker() {
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const broker = yield* Workers.Worker.ref("CredentialBroker", {
    stack: "masseater-dev-credential-broker",
    stage: "prod",
  });
  const access = yield* ownerMcpAccess({
    id: "McpAccess",
    name: `${PREFIX}access`,
    host: SITE_HOST,
    portalServerId: SERVER_NAME,
  });
  return yield* Workers.Worker("Mcp", {
    name: `${PREFIX}worker`,
    main: "./src/app/twilog.worker.ts",
    logpush: true,
    domain: SITE_HOST,
    workersDev: false,
    env: {
      TOOL_CALLS,
      ACCESS_OAUTH: Workers.WorkerEntrypoint<AccessOAuth>(broker, "AccessOAuth"),
      ...access,
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

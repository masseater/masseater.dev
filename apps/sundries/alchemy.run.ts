import {
  AnalyticsEngine,
  CloudflareEnvironment,
  D1,
  Vectorize,
  Workers,
} from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerMcpAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { ownerStack } from "@masseater.dev/owner-stack";
import type { TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";
import type {
  AccessOAuth,
  ClaudeRoutine,
  SloppediaGitHub,
} from "@masseater.dev/repositories/credential-broker.worker";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SERVER_NAME, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const PROD = "prod";

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

const upstreams = Effect.gen(function* upstreams() {
  const holder = yield* ownerStack;
  const SLIDE_INDEX = yield* Vectorize.Index.ref("DeckSearchIndex", holder);
  const broker = yield* Workers.Worker.ref("CredentialBroker", {
    stack: "masseater-dev-credential-broker",
    stage: PROD,
  });
  const translate = yield* Workers.Worker.ref("Translate", {
    stack: "masseater-dev-plamo-translate",
    stage: PROD,
  });
  const webAnalyticsToken = yield* Workers.Worker.ref("WebAnalyticsToken", {
    stack: "masseater-dev",
    stage: PROD,
  });
  return {
    SLIDE_INDEX,
    SLOPPEDIA_GITHUB: Workers.WorkerEntrypoint<SloppediaGitHub>(broker, "SloppediaGitHub"),
    ACCESS_OAUTH: Workers.WorkerEntrypoint<AccessOAuth>(broker, "AccessOAuth"),
    CLAUDE_ROUTINE: Workers.WorkerEntrypoint<ClaudeRoutine>(broker, "ClaudeRoutine"),
    WEB_ANALYTICS_TOKEN: Workers.WorkerEntrypoint(webAnalyticsToken),
    TRANSLATOR: Workers.WorkerEntrypoint<TranslatorRpc>(translate, "Translator"),
  };
});

const worker = Effect.gen(function* worker() {
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const CLAUDE_REQUESTS = yield* D1.Database("ClaudeRequests", { migrations: "./migrations" });
  return yield* Workers.Worker("Mcp", {
    name: `${PREFIX}worker`,
    main: "./src/app/sundries.worker.ts",
    logpush: true,
    domain: SITE_HOST,
    workersDev: false,
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

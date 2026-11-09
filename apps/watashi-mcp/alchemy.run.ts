import {
  AnalyticsEngine,
  CloudflareEnvironment,
  D1,
  Vectorize,
  Workers,
  providers,
  state,
} from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { tracedProviders } from "@masseater.dev/cloudflare-account/traced-providers";
import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const PROD = "prod";

const personalSpace = Effect.gen(function* personalSpace() {
  const SLIDE_INDEX = yield* Vectorize.Index.ref("DeckSearchIndex", {
    stack: "mydecklist",
    stage: PROD,
  });
  return { SLIDE_INDEX };
});

const account = Effect.gen(function* account() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const broker = yield* Workers.Worker.ref("CredentialBroker", {
    stack: "masseater-dev-credential-broker",
    stage: PROD,
  });
  const webAnalyticsToken = yield* Workers.Worker.ref("WebAnalyticsToken", {
    stack: "masseater-dev",
    stage: PROD,
  });
  return {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    SLOPPEDIA_GITHUB: Workers.WorkerEntrypoint<SloppediaGitHub>(broker, "SloppediaGitHub"),
    WEB_ANALYTICS_TOKEN: Workers.WorkerEntrypoint(webAnalyticsToken),
  };
});

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { name: `${PREFIX}db`, migrations: "./drizzle" });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.some(`${PREFIX}web`),
    bindings: {
      DB,
      TOOL_CALLS,
      AI: Workers.AI(),
      ...(yield* personalSpace),
      ...(yield* account),
    },
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

import {
  Access,
  AnalyticsEngine,
  CloudflareEnvironment,
  Vectorize,
  Workers,
} from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import type { TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";
import type {
  AccessOAuth,
  SloppediaGitHub,
} from "@masseater.dev/repositories/credential-broker.worker";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SITE_HOST, TOOL_CALL_DATASET } from "./src/shared/config/index.ts";

const { Application: defineApplication } = Access;

const PROD = "prod";
const SESSION_DURATION = "720h";
const ACCESS_TOKEN_LIFETIME = "1h";
const PORTAL_SERVER_ID = "sundries";
const SHARED_OAUTH_CALLBACK =
  "https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback";
const CLIENT_CALLBACKS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://agent.meta.ai/api/hatch/oauth/callback",
  SHARED_OAUTH_CALLBACK,
];

const personalSpace = { stack: "mydecklist", stage: PROD };

const portalCallback = (accountId: string): string =>
  `https://dash.cloudflare.com/${accountId}/one/access-controls/ai-controls/mcp-server/oauth-callback/${PORTAL_SERVER_ID}`;

const ownerAccess = Effect.gen(function* ownerAccess() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const owner = yield* Access.Policy.ref("OwnerPolicy", personalSpace);
  const google = yield* Access.IdentityProvider.ref("Google", personalSpace);
  const team = yield* Access.Organization.ref("ZeroTrust", personalSpace);
  const application = yield* defineApplication("McpAccess", {
    name: `${PREFIX}access`,
    type: "self_hosted",
    domain: SITE_HOST,
    destinations: [{ type: "public", uri: SITE_HOST }],
    sessionDuration: SESSION_DURATION,
    allowedIdps: [google.identityProviderId],
    autoRedirectToIdentity: true,
    policies: [owner],
    oauthConfiguration: {
      enabled: true,
      grant: { sessionDuration: SESSION_DURATION, accessTokenLifetime: ACCESS_TOKEN_LIFETIME },
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: [...CLIENT_CALLBACKS, portalCallback(accountId)],
        allowAnyOnLocalhost: true,
        allowAnyOnLoopback: true,
      },
    },
  });
  return {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    ACCESS_TEAM_DOMAIN: team.authDomain,
    ACCESS_AUDIENCE: application.aud,
  };
});

const upstreams = Effect.gen(function* upstreams() {
  const SLIDE_INDEX = yield* Vectorize.Index.ref("DeckSearchIndex", personalSpace);
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
    WEB_ANALYTICS_TOKEN: Workers.WorkerEntrypoint(webAnalyticsToken),
    TRANSLATOR: Workers.WorkerEntrypoint<TranslatorRpc>(translate, "Translator"),
  };
});

const worker = Effect.gen(function* worker() {
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  return yield* Workers.Worker("Mcp", {
    name: `${PREFIX}worker`,
    main: "./src/app/sundries.worker.ts",
    logpush: true,
    domain: SITE_HOST,
    workersDev: false,
    env: {
      TOOL_CALLS,
      AI: Workers.AI(),
      ...(yield* ownerAccess),
      ...(yield* upstreams),
    },
  });
});

type WorkerEnv = InferEnv<typeof worker>;

export type { WorkerEnv };
export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* worker;
    yield* requireAppPrefix;
    return { mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);

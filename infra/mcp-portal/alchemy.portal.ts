import {
  Access,
  ApiToken,
  CloudflareEnvironment,
  DNS,
  Zone,
  providers,
  state,
} from "@alchemy.run/cloudflare";
import {
  createAccessApplicationForAccount,
  deleteAccessApplicationForAccount,
  updateAccessAiControlMcpPortal,
  updateAccessApplicationForAccount,
} from "@distilled.cloud/cloudflare/zero-trust";
import type {
  AccessAiControlsMcpPortalsUpdateRequestCodeMode,
  AccessAiControlsMcpPortalsUpdateRequestServersList,
  CreateAccessApplicationForAccountRequest,
} from "@distilled.cloud/cloudflare/zero-trust";
import { Resource as defineResource, Stack as defineStack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { succeed as succeedProvider } from "alchemy/Provider";
import { map as mapArray } from "effect/Array";
import type { ConfigError } from "effect/Config";
import {
  all,
  as,
  asVoid,
  catchTag,
  die,
  flatMap,
  flatten,
  gen,
  map,
  orDie,
  succeed,
  void as unit,
} from "effect/Effect";
import type { Effect } from "effect/Effect";
import { mergeAll, provideMerge } from "effect/Layer";
import { fromNullishOr, map as mapOption, match } from "effect/Option";

const { McpPortal: defineMcpPortal, McpServer: defineMcpServer, Policy: definePolicy } = Access;
const { Record: defineRecord } = DNS;
const { resolveZoneId } = Zone;

const MCP_ACCESS_APP = "PersonalSpace.McpAccessApplication";
const PORTAL_SERVERS = "PersonalSpace.McpPortalServers";
const PORTAL_HOST = "mcp.masseater.dev";
const PORTAL_GATEWAY = "gateway.agents.cloudflare.com";
const sessionDuration = "720h";

const oauth = succeed({ authType: "oauth", isSharedOauthCallbackEnabled: true } as const);

const cloudflareReader = ApiToken.AccountApiToken.ref("CloudflareReader", {
  stack: "masseater-dev",
  stage: "prod",
}).pipe(map(({ value }) => ({ authType: "bearer", authCredentials: value }) as const));

const upstreams = [
  { id: "watashi", url: "https://watashi.masseater.dev/mcp", auth: oauth },
  { id: "mirucord", url: "https://mirucord.masseater.dev/mcp", auth: oauth },
  { id: "medley", url: "https://medley-manager.masseater.dev/mcp", auth: oauth },
  { id: "twilog-masseater", url: "https://twilog-mcp.togetter.dev/mcp", auth: oauth },
  { id: "twilog-u1-mas", url: "https://twilog-mcp.togetter.dev/mcp", auth: oauth },
  { id: "atra", url: "https://mcp.atra.bot/mcp", auth: oauth },
  { id: "flovia", url: "https://api.flovia.dev/mcp", auth: oauth },
  { id: "cloudflare", url: "https://mcp.cloudflare.com/mcp", auth: cloudflareReader },
] as const;

type McpAccessApplicationResource = defineResource<
  typeof MCP_ACCESS_APP,
  Readonly<
    Required<
      Pick<
        CreateAccessApplicationForAccountRequest,
        "name" | "type" | "destinations" | "policies" | "sessionDuration"
      >
    > &
      Pick<CreateAccessApplicationForAccountRequest, "oauthConfiguration">
  >,
  Readonly<{ accountId: string; appId: string }>
>;

const mcpAccessApplication = defineResource<McpAccessApplicationResource>(MCP_ACCESS_APP);

type PortalServersResource = defineResource<
  typeof PORTAL_SERVERS,
  Readonly<{
    portalId: string;
    servers: AccessAiControlsMcpPortalsUpdateRequestServersList;
    codeMode: AccessAiControlsMcpPortalsUpdateRequestCodeMode;
  }>,
  Readonly<{ accountId: string; portalId: string }>
>;

const portalServers = defineResource<PortalServersResource>(PORTAL_SERVERS);

const accountIdOf = flatten(CloudflareEnvironment).pipe(map(({ accountId }) => accountId));

const mcpAccessApplicationProvider = succeedProvider(mcpAccessApplication, {
  diff: () => succeed({ action: "update" } as const),
  reconcile: ({ news, output }) =>
    gen(function* reconcileApplication() {
      const accountId = yield* accountIdOf;
      const saved = yield* match(fromNullishOr(output).pipe(mapOption(({ appId }) => appId)), {
        onNone: () => createAccessApplicationForAccount({ accountId, ...news }),
        onSome: (appId) => updateAccessApplicationForAccount({ accountId, appId, ...news }),
      });
      return yield* match(fromNullishOr(saved.id), {
        onNone: () => die(new Error(`Access application ${news.name} has no id`)),
        onSome: (appId) => succeed({ accountId, appId }),
      });
    }),
  delete: ({ output }) =>
    deleteAccessApplicationForAccount(output).pipe(
      catchTag("AccessApplicationNotFound", () => unit),
    ),
});

const portalServersProvider = succeedProvider(portalServers, {
  diff: () => succeed({ action: "update" } as const),
  reconcile: ({ news }) =>
    accountIdOf.pipe(
      flatMap((accountId) =>
        updateAccessAiControlMcpPortal({
          accountId,
          id: news.portalId,
          servers: news.servers,
          codeMode: news.codeMode,
        }).pipe(as({ accountId, portalId: news.portalId })),
      ),
    ),
  delete: ({ output }) =>
    updateAccessAiControlMcpPortal({
      accountId: output.accountId,
      id: output.portalId,
      servers: [],
    }).pipe(
      asVoid,
      catchTag("McpPortalNotFound", () => unit),
    ),
});

const mcpPortalProviders = mergeAll(mcpAccessApplicationProvider, portalServersProvider);

const viewerPolicy = definePolicy
  .ref("OwnerPolicy", { stack: "mydecklist", stage: "prod" })
  .pipe(map(({ policyId }) => [{ id: policyId, precedence: 1 }]));

const portalDns = gen(function* portalDns() {
  const accountId = yield* accountIdOf;
  const zoneId = yield* resolveZoneId({ accountId, zone: PORTAL_HOST, hostname: PORTAL_HOST }).pipe(
    orDie,
  );
  yield* defineRecord("McpPortalCname", {
    zoneId,
    name: PORTAL_HOST,
    type: "CNAME",
    content: PORTAL_GATEWAY,
    proxied: true,
  });
});

const upstreamServers = gen(function* upstreamServers() {
  const policies = yield* viewerPolicy;
  return yield* all(
    mapArray(upstreams, ({ id, url, auth }) =>
      gen(function* upstreamServer() {
        const server = yield* defineMcpServer(`${id}McpServer`, {
          serverId: id,
          name: id,
          hostname: url,
          ...(yield* auth),
        });
        yield* mcpAccessApplication(`${id}McpServerAccess`, {
          name: `MCP ${id}`,
          type: "mcp",
          destinations: [{ type: "via_mcp_server_portal", mcpServerId: server.serverId }],
          policies,
          sessionDuration,
        });
        return { serverId: server.serverId, onBehalf: false };
      }),
    ),
  );
});

const mcpPortal = gen(function* mcpPortal() {
  yield* portalDns;
  const portal = yield* defineMcpPortal("McpPortal", {
    portalId: "personal",
    name: "masseater",
    hostname: PORTAL_HOST,
  });
  yield* mcpAccessApplication("McpPortalAccess", {
    name: "MCP portal",
    type: "mcp_portal",
    destinations: [{ type: "public", uri: PORTAL_HOST }],
    policies: yield* viewerPolicy,
    sessionDuration,
    oauthConfiguration: {
      enabled: true,
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: ["https://agent.meta.ai/api/hatch/oauth/callback"],
      },
    },
  });
  const servers = yield* upstreamServers;
  yield* portalServers("McpPortalServers", {
    portalId: portal.portalId,
    servers,
    codeMode: "default_on",
  });
  return `https://${PORTAL_HOST}/mcp`;
});

const stackProviders = mcpPortalProviders.pipe(provideMerge(providers()));

const stack: Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = defineStack(
  "mcp-portal",
  { providers: stackProviders, state: state() },
  mcpPortal,
);

export default stack;

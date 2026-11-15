import { Access, CloudflareEnvironment } from "@alchemy.run/cloudflare";
import { ownerStack } from "@masseater.dev/owner-stack";
import { Effect } from "effect";

type OwnerAccessProps = Readonly<{
  id: string;
  name: string;
  host: string;
  loopbackClients: boolean;
}>;

type OwnerMcpAccessProps = Readonly<{
  id: string;
  name: string;
  host: string;
  portalServerId: string;
}>;

type Clients = Readonly<{
  callbacks: readonly string[];
  accessTokenLifetime: string;
  localhost: boolean;
  loopback: boolean;
}>;

type ApplicationProps = Readonly<{ id: string; name: string; host: string; clients: Clients }>;

const { Application: defineApplication } = Access;

const SESSION_DURATION = "720h";
const ACCESS_TOKEN_LIFETIME = "15m";
const MCP_ACCESS_TOKEN_LIFETIME = "1h";
const BROKER_CALLBACK = "https://credentials.masseater.dev/access-oauth/callback";
const MCP_CLIENT_CALLBACKS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://agent.meta.ai/api/hatch/oauth/callback",
  "https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback",
];

const portalCallback = (accountId: string, serverId: string): string =>
  `https://dash.cloudflare.com/${accountId}/one/access-controls/ai-controls/mcp-server/oauth-callback/${serverId}`;

const application = Effect.fn("ownerApplication")(function* application({
  id,
  name,
  host,
  clients,
}: ApplicationProps) {
  const holder = yield* ownerStack;
  const owner = yield* Access.Policy.ref("OwnerPolicy", holder);
  const google = yield* Access.IdentityProvider.ref("Google", holder);
  return yield* defineApplication(id, {
    name,
    type: "self_hosted",
    domain: host,
    destinations: [{ type: "public", uri: host }],
    sessionDuration: SESSION_DURATION,
    allowedIdps: [google.identityProviderId],
    autoRedirectToIdentity: true,
    policies: [owner],
    oauthConfiguration: {
      enabled: true,
      grant: {
        sessionDuration: SESSION_DURATION,
        accessTokenLifetime: clients.accessTokenLifetime,
      },
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: [...clients.callbacks],
        allowAnyOnLocalhost: clients.localhost,
        allowAnyOnLoopback: clients.loopback,
      },
    },
  });
});

const ownerAccess = ({ loopbackClients, ...site }: OwnerAccessProps) =>
  application({
    ...site,
    clients: {
      callbacks: [BROKER_CALLBACK],
      accessTokenLifetime: ACCESS_TOKEN_LIFETIME,
      localhost: false,
      loopback: loopbackClients,
    },
  });

const ownerMcpAccess = Effect.fn("ownerMcpAccess")(function* ownerMcpAccess({
  portalServerId,
  ...site
}: OwnerMcpAccessProps) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const team = yield* Access.Organization.ref("ZeroTrust", yield* ownerStack);
  const app = yield* application({
    ...site,
    clients: {
      callbacks: [
        BROKER_CALLBACK,
        ...MCP_CLIENT_CALLBACKS,
        portalCallback(accountId, portalServerId),
      ],
      accessTokenLifetime: MCP_ACCESS_TOKEN_LIFETIME,
      localhost: true,
      loopback: true,
    },
  });
  return {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    ACCESS_TEAM_DOMAIN: team.authDomain,
    ACCESS_AUDIENCE: app.aud,
  };
});

export { ownerAccess, ownerMcpAccess };
export type { OwnerAccessProps, OwnerMcpAccessProps };

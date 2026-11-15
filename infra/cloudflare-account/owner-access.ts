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

type OwnerApplication = Readonly<{
  id: string;
  name: string;
  host: string;
  accessTokenLifetime: string;
  dynamicClientRegistration: Readonly<{
    allowedUris: readonly string[];
    allowAnyOnLocalhost: boolean;
    allowAnyOnLoopback: boolean;
  }>;
}>;

const { Application: defineApplication } = Access;

const SESSION_DURATION = "720h";
const SITE_TOKEN_LIFETIME = "15m";
const MCP_TOKEN_LIFETIME = "1h";
const BROKER_CALLBACK = "https://credentials.masseater.dev/access-oauth/callback";
const MCP_CLIENT_CALLBACKS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://agent.meta.ai/api/hatch/oauth/callback",
  "https://oauth-callbacks.cloudflareaccess.com/cdn-cgi/access/outbound-oauth-callback",
];

const portalCallback = (accountId: string, serverId: string): string =>
  `https://dash.cloudflare.com/${accountId}/one/access-controls/ai-controls/mcp-server/oauth-callback/${serverId}`;

const ownerApplication = Effect.fn("ownerApplication")(function* ownerApplication({
  id,
  name,
  host,
  accessTokenLifetime,
  dynamicClientRegistration,
}: OwnerApplication) {
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
      grant: { sessionDuration: SESSION_DURATION, accessTokenLifetime },
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: [...dynamicClientRegistration.allowedUris],
        allowAnyOnLocalhost: dynamicClientRegistration.allowAnyOnLocalhost,
        allowAnyOnLoopback: dynamicClientRegistration.allowAnyOnLoopback,
      },
    },
  });
});

const ownerAccess = Effect.fn("ownerAccess")(function* ownerAccess({
  id,
  name,
  host,
  loopbackClients,
}: OwnerAccessProps) {
  return yield* ownerApplication({
    id,
    name,
    host,
    accessTokenLifetime: SITE_TOKEN_LIFETIME,
    dynamicClientRegistration: {
      allowedUris: [BROKER_CALLBACK],
      allowAnyOnLocalhost: false,
      allowAnyOnLoopback: loopbackClients,
    },
  });
});

const ownerMcpAccess = Effect.fn("ownerMcpAccess")(function* ownerMcpAccess({
  id,
  name,
  host,
  portalServerId,
}: OwnerMcpAccessProps) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const holder = yield* ownerStack;
  const team = yield* Access.Organization.ref("ZeroTrust", holder);
  const application = yield* ownerApplication({
    id,
    name,
    host,
    accessTokenLifetime: MCP_TOKEN_LIFETIME,
    dynamicClientRegistration: {
      allowedUris: [...MCP_CLIENT_CALLBACKS, portalCallback(accountId, portalServerId)],
      allowAnyOnLocalhost: true,
      allowAnyOnLoopback: true,
    },
  });
  return { ACCESS_TEAM_DOMAIN: team.authDomain, ACCESS_AUDIENCE: application.aud };
});

export { ownerAccess, ownerMcpAccess };
export type { OwnerAccessProps, OwnerMcpAccessProps };

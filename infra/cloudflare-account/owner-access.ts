import { Access } from "@alchemy.run/cloudflare";
import { Effect } from "effect";

type OwnerAccessProps = Readonly<{
  id: string;
  name: string;
  host: string;
  loopbackClients: boolean;
}>;

const { Application: defineApplication } = Access;

const PROD = "prod";
const SESSION_DURATION = "720h";
const ACCESS_TOKEN_LIFETIME = "15m";
const BROKER_CALLBACK = "https://credentials.masseater.dev/access-oauth/callback";

const personalSpace = { stack: "mydecklist", stage: PROD };

const ownerAccess = Effect.fn("ownerAccess")(function* ownerAccess({
  id,
  name,
  host,
  loopbackClients,
}: OwnerAccessProps) {
  const owner = yield* Access.Policy.ref("OwnerPolicy", personalSpace);
  const google = yield* Access.IdentityProvider.ref("Google", personalSpace);
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
      grant: { sessionDuration: SESSION_DURATION, accessTokenLifetime: ACCESS_TOKEN_LIFETIME },
      dynamicClientRegistration: {
        enabled: true,
        allowedUris: [BROKER_CALLBACK],
        allowAnyOnLocalhost: false,
        allowAnyOnLoopback: loopbackClients,
      },
    },
  });
});

export { ownerAccess };
export type { OwnerAccessProps };

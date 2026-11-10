import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import {
  discoveryRequest,
  dynamicClientRegistrationRequest,
  processDiscoveryResponse,
  processDynamicClientRegistrationResponse,
  processResourceDiscoveryResponse,
  resourceDiscoveryRequest,
} from "oauth4webapi";
import type { AuthorizationServer, Client } from "oauth4webapi";

import { failed, failedWith } from "./access-oauth-failed.ts";
import type { AccessOAuthFailed } from "./access-oauth-failed.ts";
import { ACCESS_TEAM_ORIGIN } from "./access-sites.ts";
import type { AccessSite } from "./access-sites.ts";
import { readSealed, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";

const BROKER_ORIGIN = "https://credentials.masseater.dev";
const LOGIN_PATH = "/access-oauth/login";
const CALLBACK_PATH = "/access-oauth/callback";
const CALLBACK_URL = `${BROKER_ORIGIN}${CALLBACK_PATH}`;
const CLIENT_NAME = "masseater.dev credential broker";

type Connection = Readonly<{ server: AuthorizationServer; client: Client }>;

type SiteContext = Readonly<{ env: AppStoreEnv; site: AccessSite }>;

const RegisteredClient = Schema.fromJsonString(Schema.Struct({ clientId: Schema.String }));

const resourceOf = (site: AccessSite): string => `https://${site}`;

const loginUrlOf = (site: AccessSite): string => `${BROKER_ORIGIN}${LOGIN_PATH}?site=${site}`;

const clientKey = (issuer: string): string => `access_oauth_client:${issuer}`;

const promised = <Value>(run: () => Promise<Value>): Effect.Effect<Value, AccessOAuthFailed> =>
  Effect.tryPromise({ try: run, catch: failed });

const issuerOf = (site: AccessSite): Effect.Effect<URL, AccessOAuthFailed> => {
  const resource = new URL(resourceOf(site));
  return promised(() => resourceDiscoveryRequest(resource)).pipe(
    Effect.flatMap((response) =>
      promised(() => processResourceDiscoveryResponse(resource, response)),
    ),
    Effect.flatMap((metadata) =>
      pipe(
        Option.fromNullishOr(metadata.authorization_servers),
        Option.flatMap(Arr.head),
        Effect.fromOption,
        Effect.mapError(() => failedWith(`${site} names no authorization server`)),
      ),
    ),
    Effect.map((issuer) => new URL(issuer)),
    Effect.filterOrFail(
      (issuer) => issuer.origin === ACCESS_TEAM_ORIGIN,
      (issuer) => failedWith(`${site} names an unexpected authorization server ${issuer.origin}`),
    ),
  );
};

const discover = (site: AccessSite): Effect.Effect<AuthorizationServer, AccessOAuthFailed> =>
  issuerOf(site).pipe(
    Effect.flatMap((issuer) =>
      promised(() => discoveryRequest(issuer, { algorithm: "oauth2" })).pipe(
        Effect.flatMap((response) => promised(() => processDiscoveryResponse(issuer, response))),
      ),
    ),
  );

const publicClient = (clientId: string): Client => ({
  client_id: clientId,
  token_endpoint_auth_method: "none",
});

const registered = (
  env: AppStoreEnv,
  issuer: string,
): Effect.Effect<Option.Option<string>, AccessOAuthFailed> =>
  readSealed({ env, name: clientKey(issuer) }).pipe(
    Effect.mapError(failed),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (json) =>
          Schema.decodeEffect(RegisteredClient)(json).pipe(
            Effect.mapBoth({
              onFailure: failed,
              onSuccess: ({ clientId }) => Option.some(clientId),
            }),
          ),
      }),
    ),
  );

const remember = (
  env: AppStoreEnv,
  issuer: string,
  clientId: string,
): Effect.Effect<void, AccessOAuthFailed> =>
  Schema.encodeEffect(RegisteredClient)({ clientId }).pipe(
    Effect.mapError(failed),
    Effect.flatMap((plaintext) =>
      writeSealed({ env, name: clientKey(issuer), plaintext }).pipe(Effect.mapError(failed)),
    ),
    Effect.andThen(Effect.logInfo("access_oauth.client_registered")),
    Effect.annotateLogs({ issuer }),
  );

const registration = {
  client_name: CLIENT_NAME,
  redirect_uris: [CALLBACK_URL],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
};

const connect = ({ env, site }: SiteContext): Effect.Effect<Connection, AccessOAuthFailed> =>
  Effect.gen(function* connectTo() {
    const server = yield* discover(site);
    const known = yield* registered(env, server.issuer);
    if (Option.isSome(known)) {
      return { server, client: publicClient(known.value) };
    }
    const response = yield* promised(() => dynamicClientRegistrationRequest(server, registration));
    const created = yield* promised(() => processDynamicClientRegistrationResponse(response));
    yield* remember(env, server.issuer, created.client_id);
    return { server, client: publicClient(created.client_id) };
  });

export { CALLBACK_PATH, CALLBACK_URL, LOGIN_PATH, connect, loginUrlOf, promised, resourceOf };
export type { Connection, SiteContext };

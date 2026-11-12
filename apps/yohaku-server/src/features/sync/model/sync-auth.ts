import { HOST } from "@masseater.dev/local-server";
import { MCP_PORT } from "@masseater.dev/yohaku-protocol";
import { SYNC_ORIGIN } from "@masseater.dev/yohaku-protocol/sync";
import { Array, Effect, Option, pipe } from "effect";
import {
  authorizationCodeGrantRequest,
  calculatePKCECodeChallenge,
  discoveryRequest,
  dynamicClientRegistrationRequest,
  generateRandomCodeVerifier,
  generateRandomState,
  None as noClientAuthentication,
  processAuthorizationCodeResponse,
  processDiscoveryResponse,
  processDynamicClientRegistrationResponse,
  processRefreshTokenResponse,
  processResourceDiscoveryResponse,
  refreshTokenGrantRequest,
  ResponseBodyError,
  resourceDiscoveryRequest,
  validateAuthResponse,
} from "oauth4webapi";
import type { Client } from "oauth4webapi";

import { SyncFailed, syncFailed } from "./sync-failed.ts";
import { readState, writeState } from "./sync-state.ts";

const CALLBACK_PATH = "/oauth/callback";
const REDIRECT_URI = `http://${HOST}:${MCP_PORT.toString()}${CALLBACK_PATH}`;
const ACCESS_ISSUER = /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/u;
const MILLISECONDS = 1000;
const NO_LIFETIME = 0;

const promised = <Value>(run: () => Promise<Value>): Effect.Effect<Value, SyncFailed> =>
  Effect.tryPromise({ try: run, catch: syncFailed });

const issuerOf = Effect.fn("issuerOf")(function* issuerOf() {
  const resource = new URL(SYNC_ORIGIN);
  const response = yield* promised(() => resourceDiscoveryRequest(resource));
  const metadata = yield* promised(() => processResourceDiscoveryResponse(resource, response));
  const issuer = yield* pipe(
    Option.fromNullishOr(metadata.authorization_servers),
    Option.flatMap(Array.head),
    Option.map((value) => new URL(value)),
    Option.filter(({ origin }) => ACCESS_ISSUER.test(origin)),
    Effect.fromOption,
    Effect.mapError(() => syncFailed(`${SYNC_ORIGIN} names no Access authorization server`)),
  );
  return issuer;
});

const discover = Effect.fn("discover")(function* discover() {
  const issuer = yield* issuerOf();
  const response = yield* promised(() => discoveryRequest(issuer, { algorithm: "oauth2" }));
  return yield* promised(() => processDiscoveryResponse(issuer, response));
});

const publicClient = (clientId: string): Client => ({
  client_id: clientId,
  token_endpoint_auth_method: "none",
});

const registration = {
  client_name: "余白",
  redirect_uris: [REDIRECT_URI],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
};

const registeredClient = Effect.fn("registeredClient")(function* registeredClient(
  register: () => Promise<Response>,
) {
  const response = yield* promised(register);
  const created = yield* promised(() => processDynamicClientRegistrationResponse(response));
  yield* writeState("client_id", created.client_id);
  return created.client_id;
});

/** @internal */
const connection = Effect.fn("connection")(function* connection() {
  const server = yield* discover();
  const known = yield* readState("client_id");
  const register = (): Promise<Response> => dynamicClientRegistrationRequest(server, registration);
  const clientId = yield* pipe(
    known,
    Option.match({ onSome: Effect.succeed, onNone: () => registeredClient(register) }),
  );
  return { server, client: publicClient(clientId) };
});

/** @internal */
const authorizationRequest = Effect.fn("authorizationRequest")(function* authorizationRequest() {
  const { server, client } = yield* connection();
  const endpoint = yield* pipe(
    Option.fromNullishOr(server.authorization_endpoint),
    Effect.fromOption,
    Effect.mapError(() => syncFailed("the authorization server has no authorization endpoint")),
  );
  const state = generateRandomState();
  const verifier = generateRandomCodeVerifier();
  const challenge = yield* promised(() => calculatePKCECodeChallenge(verifier));
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: SYNC_ORIGIN,
  }).toString();
  return { url: url.toString(), state, verifier };
});

const refreshFailed = (error: unknown): SyncFailed => {
  if (error instanceof ResponseBodyError && error.error === "invalid_grant") {
    return SyncFailed.make({ message: error.message, signedOut: true });
  }
  return syncFailed(error);
};

interface Issued {
  readonly accessToken: string;
  readonly refreshToken: Option.Option<string>;
  readonly lifetime: Option.Option<number>;
}

const grantOf = Effect.fn("grantOf")(function* grantOf(issued: Issued) {
  const now = yield* Effect.clockWith((clock) => clock.currentTimeMillis);
  yield* pipe(
    issued.refreshToken,
    Option.match({
      onNone: () => Effect.void,
      onSome: (token) => writeState("refresh_token", token),
    }),
  );
  const lifetime = pipe(
    issued.lifetime,
    Option.getOrElse(() => NO_LIFETIME),
  );
  return { accessToken: issued.accessToken, expiresAt: now + lifetime * MILLISECONDS };
});

const toIssued = Effect.map(
  ({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: lifetime,
  }: Readonly<{ access_token: string; refresh_token?: string; expires_in?: number }>): Issued => ({
    accessToken,
    refreshToken: Option.fromNullishOr(refreshToken),
    lifetime: Option.fromNullishOr(lifetime),
  }),
);

/** @internal */
const exchangeCode = Effect.fn("exchangeCode")(function* exchangeCode(
  received: Readonly<{ callback: string; state: string; verifier: string }>,
) {
  const { server, client } = yield* connection();
  const parameters = yield* Effect.try({
    try: () => validateAuthResponse(server, client, new URL(received.callback), received.state),
    catch: syncFailed,
  });
  const response = yield* promised(() =>
    authorizationCodeGrantRequest(
      server,
      client,
      noClientAuthentication(),
      parameters,
      REDIRECT_URI,
      received.verifier,
      { additionalParameters: { resource: SYNC_ORIGIN } },
    ),
  );
  const tokens = yield* promised(() =>
    processAuthorizationCodeResponse(server, client, response),
  ).pipe(toIssued);
  return yield* grantOf(tokens);
});

/** @internal */
const refreshGrant = Effect.fn("refreshGrant")(function* refreshGrant(refreshToken: string) {
  const { server, client } = yield* connection();
  const response = yield* Effect.tryPromise({
    try: () =>
      refreshTokenGrantRequest(server, client, noClientAuthentication(), refreshToken, {
        additionalParameters: { resource: SYNC_ORIGIN },
      }),
    catch: refreshFailed,
  });
  const tokens = yield* Effect.tryPromise({
    try: () => processRefreshTokenResponse(server, client, response),
    catch: refreshFailed,
  }).pipe(toIssued);
  return yield* grantOf(tokens);
});

export { CALLBACK_PATH, authorizationRequest, exchangeCode, refreshGrant };

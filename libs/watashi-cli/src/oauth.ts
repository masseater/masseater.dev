import { MCP_PATH } from "@masseater.dev/watashi-protocol";
import { Clock, Effect, Schema, String as Str } from "effect";
import type { Scope } from "effect";
import { Base64Url } from "effect/encoding";
import type { HttpClient } from "effect/http";

import { listenForCode } from "./callback-server.ts";
import { TokenShape, credentialsOf, saveCredentials } from "./credentials.ts";
import type { CredentialsError, OAuthCredentials } from "./credentials.ts";
import { getJson, postForm, postJson } from "./http-json.ts";
import type { HttpServices as Services } from "./services.ts";

const ProtectedResource = Schema.Struct({
  resource: Schema.String,
  authorization_servers: Schema.Array(Schema.String),
});

const ServerMetadata = Schema.Struct({
  authorization_endpoint: Schema.String,
  token_endpoint: Schema.String,
  registration_endpoint: Schema.String,
});

const Registered = Schema.Struct({ client_id: Schema.String });

type Discovered = typeof ServerMetadata.Type & Readonly<{ resource: string }>;

type Login = Readonly<{
  home: string;
  baseUrl: string;
  announce: (url: string) => Effect.Effect<void>;
  open: (url: string) => Effect.Effect<void>;
}>;

const SCOPE = "openid profile offline_access";
const STATE_BYTES = 16;
const VERIFIER_BYTES = 32;

const discover = (
  baseUrl: string,
): Effect.Effect<Discovered, CredentialsError, HttpClient.HttpClient> =>
  Effect.gen(function* discovery() {
    const resourceUrl = `${baseUrl}/.well-known/oauth-protected-resource${MCP_PATH}`;
    const resource = yield* getJson({ schema: ProtectedResource, url: resourceUrl });
    const [first = baseUrl] = resource.authorization_servers;
    const issuer = new URL(first);
    const issuerPath = Str.replace(/\/$/u, "")(issuer.pathname);
    const metadataUrl = `${issuer.origin}/.well-known/oauth-authorization-server${issuerPath}`;
    const metadata = yield* getJson({ schema: ServerMetadata, url: metadataUrl });
    return { ...metadata, resource: resource.resource };
  });

const randomBase64Url = (size: number): string =>
  Base64Url.encode(crypto.getRandomValues(new Uint8Array(size)));

const challengeOf = (verifier: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).pipe(
    Effect.map((digest) => Base64Url.encode(new Uint8Array(digest))),
  );

const register = (
  client: Readonly<{ endpoint: string; redirectUri: string }>,
): Effect.Effect<string, CredentialsError, HttpClient.HttpClient> =>
  postJson({
    schema: Registered,
    url: client.endpoint,
    body: {
      client_name: "watashi CLI",
      redirect_uris: [client.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    },
  }).pipe(Effect.map(({ client_id: clientId }) => clientId));

type Authorize = Readonly<{
  metadata: Discovered;
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}>;

const authorizeUrl = (request: Authorize): string => {
  const url = new URL(request.metadata.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    scope: SCOPE,
    state: request.state,
    code_challenge: request.challenge,
    code_challenge_method: "S256",
    resource: request.metadata.resource,
    prompt: "consent",
  }).toString();
  return url.toString();
};

type Exchange = Readonly<{
  metadata: Discovered;
  clientId: string;
  redirectUri: string;
  verifier: string;
  code: string;
}>;

const exchange = (
  request: Exchange,
): Effect.Effect<OAuthCredentials, CredentialsError, HttpClient.HttpClient> =>
  postForm({
    schema: TokenShape,
    url: request.metadata.token_endpoint,
    form: {
      grant_type: "authorization_code",
      code: request.code,
      redirect_uri: request.redirectUri,
      client_id: request.clientId,
      code_verifier: request.verifier,
      resource: request.metadata.resource,
    },
  }).pipe(
    Effect.flatMap((token) => Clock.currentTimeMillis.pipe(Effect.map((now) => ({ token, now })))),
    Effect.map(({ token, now }) => {
      const base = {
        tokenEndpoint: request.metadata.token_endpoint,
        clientId: request.clientId,
        resource: request.metadata.resource,
      };
      return credentialsOf({ base, token, now });
    }),
  );

const authorize = (
  request: Login,
  metadata: Discovered,
): Effect.Effect<Exchange, CredentialsError, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function* authorizeInBrowser() {
    const state = randomBase64Url(STATE_BYTES);
    const { redirectUri, code } = yield* listenForCode(state);
    const clientId = yield* register({ endpoint: metadata.registration_endpoint, redirectUri });
    const verifier = randomBase64Url(VERIFIER_BYTES);
    const challenge = yield* challengeOf(verifier);
    const url = authorizeUrl({ metadata, clientId, redirectUri, state, challenge });
    yield* Effect.andThen(request.announce(url), request.open(url));
    const received = yield* code;
    return { metadata, clientId, redirectUri, verifier, code: received };
  });

const login = (request: Login): Effect.Effect<OAuthCredentials, CredentialsError, Services> =>
  Effect.gen(function* signIn() {
    const metadata = yield* discover(request.baseUrl);
    const authorized = yield* authorize(request, metadata);
    const credentials = yield* exchange(authorized);
    yield* saveCredentials({ home: request.home, credentials });
    return credentials;
  }).pipe(Effect.scoped);

/** @internal */
export { login };
/** @internal */
export type { Login };

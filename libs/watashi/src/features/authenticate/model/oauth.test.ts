import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import {
  Clock,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Record as Rec,
  Redacted,
  Ref,
} from "effect";
import { Base64Url } from "effect/encoding";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { expect } from "vite-plus/test";

import { freshAccessToken, loadCredentials, saveCredentials } from "./credentials.ts";
import { login } from "./oauth.ts";

type Form = Readonly<Record<string, string>>;

type FakeAuth = Readonly<{
  client: HttpClient.HttpClient;
  forms: () => readonly Form[];
  registrations: () => readonly string[];
  approve: (real: HttpClient.HttpClient) => (authorizeUrl: string) => Effect.Effect<void>;
}>;

type AuthState = Readonly<{
  forms: readonly Form[];
  registrations: readonly string[];
  challenge: string;
  refreshes: number;
}>;

const BASE = "https://watashi.test";
const OWNER_ONLY = 0o600;
const PERMISSION_RANGE = 0o1000;
const NEAR_EXPIRY = 10_000;
const BAD_REQUEST = 400;
const CREATED = 201;
const NOT_FOUND = 404;
const EXPIRES_IN = 3600;
const ONE = 1;

const METADATA = {
  authorization_endpoint: `${BASE}/api/auth/oauth2/authorize`,
  token_endpoint: `${BASE}/api/auth/oauth2/token`,
  registration_endpoint: `${BASE}/api/auth/oauth2/register`,
};

const PROTECTED_RESOURCE = { resource: `${BASE}/mcp`, authorization_servers: [`${BASE}/api/auth`] };

const encoder = new TextEncoder();

const challengeOf = (verifier: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", encoder.encode(verifier))).pipe(
    Effect.map((digest) => Base64Url.encode(new Uint8Array(digest))),
  );

const textOf = (request: HttpClientRequest.HttpClientRequest): Effect.Effect<string> =>
  HttpClientRequest.toWeb(request).pipe(
    Effect.flatMap((web) => Effect.promise(() => web.text())),
    Effect.orDie,
  );

const field = (form: Form, name: string): string =>
  Option.getOrElse(Option.fromNullishOr(form[name]), () => "");

const issued = (round: string): Response =>
  Response.json({
    access_token: `access-${round}`,
    refresh_token: `refresh-${round}`,
    expires_in: EXPIRES_IN,
  });

const exchange = (state: Ref.Ref<AuthState>, form: Form): Effect.Effect<Response> =>
  Effect.all([challengeOf(field(form, "code_verifier")), Ref.get(state)]).pipe(
    Effect.map(([digest, current]) => {
      if (digest !== current.challenge || field(form, "code") !== "code-1") {
        return new Response("bad", { status: BAD_REQUEST });
      }
      return issued("1");
    }),
  );

const refresh = (state: Ref.Ref<AuthState>): Effect.Effect<Response> =>
  Ref.modify(state, (current): readonly [Response, AuthState] => {
    const refreshes = current.refreshes + ONE;
    return [issued(`r${String(refreshes)}`), { ...current, refreshes }];
  });

const tokenResponse = (state: Ref.Ref<AuthState>, body: string): Effect.Effect<Response> => {
  const form: Form = Rec.fromEntries(new URLSearchParams(body));
  return Ref.update(state, (current) => ({ ...current, forms: [...current.forms, form] })).pipe(
    Effect.flatMap(() => {
      if (field(form, "grant_type") === "authorization_code") {
        return exchange(state, form);
      }
      return refresh(state);
    }),
  );
};

const register = (state: Ref.Ref<AuthState>, body: string): Effect.Effect<Response> =>
  Ref.update(state, (current) => ({
    ...current,
    registrations: [...current.registrations, body],
  })).pipe(Effect.as(Response.json({ client_id: "client-1" }, { status: CREATED })));

const route = (state: Ref.Ref<AuthState>, path: string, body: string): Effect.Effect<Response> => {
  if (path === "/.well-known/oauth-protected-resource/mcp") {
    return Effect.succeed(Response.json(PROTECTED_RESOURCE));
  }
  if (path === "/.well-known/oauth-authorization-server/api/auth") {
    return Effect.succeed(Response.json(METADATA));
  }
  if (path === "/api/auth/oauth2/register") {
    return register(state, body);
  }
  if (path === "/api/auth/oauth2/token") {
    return tokenResponse(state, body);
  }
  return Effect.succeed(new Response("not found", { status: NOT_FOUND }));
};

const redirectOf = (authorizeUrl: string): string => {
  const url = new URL(authorizeUrl);
  const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
  redirect.searchParams.set("code", "code-1");
  redirect.searchParams.set("state", url.searchParams.get("state") ?? "");
  return redirect.toString();
};

const approveWith =
  (state: Ref.Ref<AuthState>, real: HttpClient.HttpClient) =>
  (authorizeUrl: string): Effect.Effect<void> => {
    const url = new URL(authorizeUrl);
    const challenge = url.searchParams.get("code_challenge") ?? "";
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("resource")).toBe(`${BASE}/mcp`);
    const callback = real.get(redirectOf(authorizeUrl));
    return Ref.update(state, (current) => ({ ...current, challenge })).pipe(
      Effect.andThen(callback),
      Effect.orDie,
      Effect.asVoid,
    );
  };

const fakeAuth = (): FakeAuth => {
  const state = Ref.makeUnsafe<AuthState>({
    forms: [],
    registrations: [],
    challenge: "",
    refreshes: 0,
  });
  const client = HttpClient.make((request) =>
    textOf(request).pipe(
      Effect.flatMap((body) => route(state, new URL(request.url).pathname, body)),
      Effect.map((response) => HttpClientResponse.fromWeb(request, response)),
    ),
  );
  return {
    client,
    forms: () => Ref.getUnsafe(state).forms,
    registrations: () => Ref.getUnsafe(state).registrations,
    approve: (real) => approveWith(state, real),
  };
};

const tempHome = Effect.gen(function* makeHome() {
  const fs = yield* FileSystem.FileSystem;
  return yield* fs.makeTempDirectoryScoped({ prefix: "watashi-oauth-" });
});

const accessOf = (token: Option.Option<Redacted.Redacted>): Option.Option<string> =>
  token.pipe(Option.map(Redacted.value));

const expectSaved = Effect.fnUntraced(function* savedOnlyForOwner(
  home: string,
  refreshToken: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const saved = yield* loadCredentials(home);
  expect(saved.pipe(Option.map((value) => value.refreshToken))).toEqual(Option.some(refreshToken));
  const info = yield* fs.stat(path.join(home, "oauth.json"));
  expect(info.mode % PERMISSION_RANGE).toBe(OWNER_ONLY);
});

const signsIn = Effect.gen(function* signIn() {
  const real = yield* HttpClient.HttpClient;
  const home = yield* tempHome;
  const auth = fakeAuth();
  const credentials = yield* login({
    home,
    baseUrl: BASE,
    announce: () => Effect.void,
    open: auth.approve(real),
  }).pipe(Effect.provideService(HttpClient.HttpClient, auth.client));
  expect(credentials.accessToken).toBe("access-1");
  yield* expectSaved(home, "refresh-1");
  expect(auth.forms()).toContainEqual(expect.objectContaining({ resource: `${BASE}/mcp` }));
  expect(auth.registrations()).toEqual([
    expect.stringMatching(/"redirect_uris":\["http:\/\/127\.0\.0\.1:\d+\/callback"\]/u),
  ]);
}).pipe(Effect.scoped);

const refreshesNearExpiry = Effect.gen(function* refreshes() {
  const home = yield* tempHome;
  const auth = fakeAuth();
  const now = yield* Clock.currentTimeMillis;
  yield* saveCredentials({
    home,
    credentials: {
      tokenEndpoint: METADATA.token_endpoint,
      clientId: "client-1",
      resource: `${BASE}/mcp`,
      accessToken: "old",
      refreshToken: "refresh-1",
      expiresAt: now + NEAR_EXPIRY,
    },
  });
  const fresh = freshAccessToken(home).pipe(
    Effect.provideService(HttpClient.HttpClient, auth.client),
  );
  const first = yield* fresh;
  expect(accessOf(first)).toEqual(Option.some("access-r1"));
  yield* expectSaved(home, "refresh-r1");
  const second = yield* fresh;
  expect(accessOf(second)).toEqual(Option.some("access-r1"));
}).pipe(Effect.scoped);

const anonymous = Effect.gen(function* withoutLogin() {
  const home = yield* tempHome;
  const token = yield* freshAccessToken(home).pipe(
    Effect.provideService(HttpClient.HttpClient, fakeAuth().client),
  );
  expect(Option.isNone(token)).toBe(true);
}).pipe(Effect.scoped);

layer(Layer.mergeAll(nodeServices, FetchHttpClient.layer))("OAuth login", (it) => {
  it.effect("registers, uses PKCE and saves the tokens readable only by the owner", () => signsIn);
  it.effect("refreshes a token close to expiry and keeps the new one", () => refreshesNearExpiry);
  it.effect("returns nothing without a login", () => anonymous);
});

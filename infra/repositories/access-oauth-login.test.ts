import { Effect, Option } from "effect";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { accessOAuthRoute } from "./access-oauth-login.ts";
import { memoryStore } from "./app-store.test.support.ts";
import type { MemoryStore } from "./app-store.test.support.ts";

const TEAM = "https://masseater.cloudflareaccess.com";
const SITE = "personal.masseater.dev";
const BROKER = "https://credentials.masseater.dev";
const CODE = "issued-code";
const CREATED = 201;
const NOT_FOUND = 404;
const OK = 200;
const FOUND = 302;
const BAD_REQUEST = 400;

const json = (body: unknown, status = OK): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const SERVER_METADATA = {
  issuer: TEAM,
  authorization_endpoint: `${TEAM}/cdn-cgi/access/oauth/authorization`,
  token_endpoint: `${TEAM}/cdn-cgi/access/oauth/token`,
  registration_endpoint: `${TEAM}/cdn-cgi/access/oauth/registration`,
  code_challenge_methods_supported: ["S256"],
};

const ROUTES: Readonly<Record<string, () => Response>> = {
  [`GET https://${SITE}/.well-known/oauth-protected-resource`]: () =>
    json({ resource: `https://${SITE}`, authorization_servers: [TEAM] }),
  [`GET ${TEAM}/.well-known/oauth-authorization-server`]: () => json(SERVER_METADATA),
  [`POST ${TEAM}/cdn-cgi/access/oauth/registration`]: () =>
    json({ client_id: "broker-client", token_endpoint_auth_method: "none" }, CREATED),
  [`POST ${TEAM}/cdn-cgi/access/oauth/token`]: () =>
    json({
      access_token: "issued-access",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "issued-refresh",
    }),
};

const fakeAccess: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const answer = Option.fromNullishOr(ROUTES[`${request.method} ${url.origin}${url.pathname}`]);
  return Promise.resolve(
    Option.match(answer, {
      onNone: () => new Response("", { status: NOT_FOUND }),
      onSome: (respond) => respond(),
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

type Env = MemoryStore["env"];

const route = (env: Env, url: string): Effect.Effect<Response> =>
  Option.getOrElse(accessOAuthRoute({ request: new Request(url), env }), () =>
    Effect.succeed(new Response("", { status: NOT_FOUND })),
  );

const stateOf = (response: Response): string =>
  new URL(response.headers.get("location") ?? BROKER).searchParams.get("state") ?? "";

test("Access から state 付きで戻ったコールバックで、トークンを受け取って保存する", () =>
  Effect.runPromise(
    Effect.gen(function* loginAndReturn() {
      vi.stubGlobal("fetch", fakeAccess);
      const { env, rows } = memoryStore();
      const started = yield* route(env, `${BROKER}/access-oauth/login?site=${SITE}`);
      expect(started.status).toBe(FOUND);
      const state = stateOf(started);
      const finished = yield* route(
        env,
        `${BROKER}/access-oauth/callback?code=${CODE}&state=${state}`,
      );
      const body = yield* Effect.promise(() => finished.text());
      expect(body).toBe(`${SITE} に接続しました`);
      expect(finished.status).toBe(OK);
      expect(Option.isSome(rows.get(`access_oauth_grant:${SITE}`))).toBe(true);
    }),
  ));

test("同じ state で 2 回戻ってきたら 2 回目は断る", () =>
  Effect.runPromise(
    Effect.gen(function* replay() {
      vi.stubGlobal("fetch", fakeAccess);
      const { env } = memoryStore();
      const started = yield* route(env, `${BROKER}/access-oauth/login?site=${SITE}`);
      const callback = `${BROKER}/access-oauth/callback?code=${CODE}&state=${stateOf(started)}`;
      yield* route(env, callback);
      const again = yield* route(env, callback);
      expect(again.status).toBe(BAD_REQUEST);
    }),
  ));

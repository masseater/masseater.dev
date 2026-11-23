import { Array as Arr, Duration, Effect, Option, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";
import type { DefaultBodyType, StrictRequest } from "msw";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test } from "vite-plus/test";

import { memoryStore } from "#/shared/lib/app-store.test.support.ts";
import type { MemoryStore } from "#/shared/lib/app-store.test.support.ts";

import { accessOAuthRoute, sweepPendingLogins } from "./access-oauth-login.ts";

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

const fakeAccess = (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const answer = Option.fromNullishOr(ROUTES[`${request.method} ${url.origin}${url.pathname}`]);
  return Promise.resolve(
    Option.match(answer, {
      onNone: () => new Response("", { status: NOT_FOUND }),
      onSome: (respond) => respond(),
    }),
  );
};

const EMPTY = 0;

const workerRequestOf = (request: StrictRequest<DefaultBodyType>, body: ArrayBuffer): Request =>
  new Request(request.url, {
    method: request.method,
    headers: [...request.headers],
    body: Option.getOrNull(Option.liftPredicate(body, (bytes) => bytes.byteLength > EMPTY)),
  });

const answering =
  (answer: (request: Request) => Promise<Response>) =>
  ({ request }: Readonly<{ request: StrictRequest<DefaultBodyType> }>): Promise<Response> =>
    Effect.runPromise(
      Effect.promise(() => request.arrayBuffer()).pipe(
        Effect.map((body) => workerRequestOf(request, body)),
        Effect.flatMap((worker) => Effect.promise(() => answer(worker))),
      ),
    );

const network = setupServer();

const answeredBy = (answer: (request: Request) => Promise<Response>): void => {
  network.use(http.all("*", answering(answer)));
};

beforeAll(() => {
  network.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.close();
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
      answeredBy(fakeAccess);
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
      answeredBy(fakeAccess);
      const { env } = memoryStore();
      const started = yield* route(env, `${BROKER}/access-oauth/login?site=${SITE}`);
      const callback = `${BROKER}/access-oauth/callback?code=${CODE}&state=${stateOf(started)}`;
      yield* route(env, callback);
      const again = yield* route(env, callback);
      expect(again.status).toBe(BAD_REQUEST);
    }),
  ));

const TWILOG = "https://twilog-mcp.togetter.dev";
const TWILOG_SITE = "twilog/u1_mas";

const TWILOG_ROUTES: Readonly<Record<string, () => Response>> = {
  [`GET ${TWILOG}/.well-known/oauth-protected-resource/mcp`]: () =>
    json({ resource: `${TWILOG}/mcp`, authorization_servers: [TWILOG] }),
  [`GET ${TWILOG}/.well-known/oauth-authorization-server`]: () =>
    json({
      issuer: TWILOG,
      authorization_endpoint: `${TWILOG}/authorize`,
      token_endpoint: `${TWILOG}/token`,
      registration_endpoint: `${TWILOG}/register`,
      code_challenge_methods_supported: ["S256"],
    }),
  [`POST ${TWILOG}/register`]: () =>
    json({ client_id: "twilog-client", token_endpoint_auth_method: "none" }, CREATED),
  [`POST ${TWILOG}/token`]: () =>
    json({
      access_token: "twilog-access",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "twilog-refresh",
    }),
};

const fakeTwilog = (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const answer = Option.fromNullishOr(
    TWILOG_ROUTES[`${request.method} ${url.origin}${url.pathname}`],
  );
  return Promise.resolve(
    Option.match(answer, {
      onNone: () => new Response("", { status: NOT_FOUND }),
      onSome: (respond) => respond(),
    }),
  );
};

test("twilog のアカウントは twilog の認可サーバーへ scope と MCP の resource を付けて送る", () =>
  Effect.runPromise(
    Effect.gen(function* twilogLogin() {
      answeredBy(fakeTwilog);
      const { env } = memoryStore();
      const login = new URL(`${BROKER}/access-oauth/login`);
      login.searchParams.set("site", TWILOG_SITE);
      const started = yield* route(env, login.href);
      const location = new URL(started.headers.get("location") ?? BROKER);
      expect([started.status, location.origin, location.pathname]).toStrictEqual([
        FOUND,
        TWILOG,
        "/authorize",
      ]);
      expect([
        location.searchParams.get("scope"),
        location.searchParams.get("resource"),
        location.searchParams.get("client_id"),
      ]).toStrictEqual(["twilog.read offline_access", `${TWILOG}/mcp`, "twilog-client"]);
    }),
  ));

test("twilog のアカウントごとに別のトークンとして保存する", () =>
  Effect.runPromise(
    Effect.gen(function* twilogGrant() {
      answeredBy(fakeTwilog);
      const { env, rows } = memoryStore();
      const login = new URL(`${BROKER}/access-oauth/login`);
      login.searchParams.set("site", TWILOG_SITE);
      const started = yield* route(env, login.href);
      const finished = yield* route(
        env,
        `${BROKER}/access-oauth/callback?code=${CODE}&state=${stateOf(started)}`,
      );
      expect(finished.status).toBe(OK);
      expect([
        Option.isSome(rows.get(`access_oauth_grant:${TWILOG_SITE}`)),
        Option.isSome(rows.get("access_oauth_grant:twilog/r_masseater")),
      ]).toStrictEqual([true, false]);
    }),
  ));

const STATE_PREFIX = "access_oauth_state:";
const LOGIN = `${BROKER}/access-oauth/login?site=${SITE}`;
const PAST_LIFETIME = Duration.fromInputUnsafe("61 minutes");
const ONE_ROW = 1;
const TWO_ROWS = 2;

const pendingRows = (rows: MemoryStore["rows"]): readonly string[] =>
  pipe(rows.names(), Arr.filter(Str.startsWith(STATE_PREFIX)));

test("使い終えた state の行は残さない", () =>
  Effect.runPromise(
    Effect.gen(function* consumed() {
      answeredBy(fakeAccess);
      const { env, rows } = memoryStore();
      const started = yield* route(env, LOGIN);
      const pending = pendingRows(rows);
      yield* route(env, `${BROKER}/access-oauth/callback?code=${CODE}&state=${stateOf(started)}`);
      expect(pending).toHaveLength(ONE_ROW);
      expect(pendingRows(rows)).toStrictEqual([]);
    }),
  ));

const clock = TestClock.layer();

const abandon = (env: Env): Effect.Effect<void> =>
  Effect.andThen(route(env, LOGIN), route(env, LOGIN)).pipe(Effect.asVoid);

test("戻ってこなかったログインの state は、期限を過ぎたら掃除し、期限内のものは残す", () =>
  Effect.runPromise(
    Effect.gen(function* stale() {
      answeredBy(fakeAccess);
      const { env, rows } = memoryStore();
      yield* abandon(env);
      yield* sweepPendingLogins(env);
      const early = pendingRows(rows);
      yield* TestClock.adjust(PAST_LIFETIME);
      const fresh = yield* route(env, LOGIN);
      yield* sweepPendingLogins(env);
      expect([early.length, pendingRows(rows)]).toStrictEqual([
        TWO_ROWS,
        [`${STATE_PREFIX}${stateOf(fresh)}`],
      ]);
    }).pipe(Effect.provide(clock)),
  ));

const unreachable = (): Promise<Response> =>
  Promise.resolve(new Response("upstream-secret-detail", { status: NOT_FOUND }));

const FAILING = [
  LOGIN,
  `${BROKER}/access-oauth/login?site=unknown`,
  `${BROKER}/access-oauth/callback?state=x`,
];

const REJECTION = [BAD_REQUEST, "ログインに失敗しました", "最初からやり直す:"];

const headOf = (response: Response): Effect.Effect<readonly (number | string)[]> =>
  Effect.promise(() => response.text()).pipe(
    Effect.map((body) => [response.status, ...Arr.take(Str.split("\n")(body), TWO_ROWS)]),
  );

test("失敗した理由は応答に書かず、やり直す入口だけを返す", () =>
  Effect.runPromise(
    Effect.gen(function* opaque() {
      answeredBy(unreachable);
      const { env } = memoryStore();
      const failures = yield* Effect.forEach(
        FAILING,
        (url) => Effect.flatMap(route(env, url), headOf),
        { concurrency: 1 },
      );
      expect(failures).toStrictEqual(Arr.makeBy(FAILING.length, () => REJECTION));
    }),
  ));

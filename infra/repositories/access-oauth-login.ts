import { Array as Arr, Clock, Effect, Option, Record as Rec, Schema, pipe } from "effect";
import {
  authorizationCodeGrantRequest,
  calculatePKCECodeChallenge,
  generateRandomCodeVerifier,
  generateRandomState,
  None as noClientAuthentication,
  processAuthorizationCodeResponse,
  validateAuthResponse,
} from "oauth4webapi";

import { failed, failedWith } from "./access-oauth-failed.ts";
import type { AccessOAuthFailed } from "./access-oauth-failed.ts";
import { grantFrom, saveGrant } from "./access-oauth-grant.ts";
import {
  CALLBACK_PATH,
  CALLBACK_URL,
  LOGIN_PATH,
  connect,
  loginUrlOf,
  promised,
  resourceOf,
} from "./access-oauth-server.ts";
import { ACCESS_SITES, ACCESS_TEAM_ORIGIN } from "./access-sites.ts";
import { readRow, swapRow, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import type { RouteInput } from "./github-app.ts";
import { unseal } from "./sealed-value.ts";

const PENDING_LIFETIME_MS = 3_600_000;
const CONSUMED = "";
const BAD_REQUEST = 400;
const FOUND = 302;

const Site = Schema.Literals(ACCESS_SITES);

const Pending = Schema.Struct({ site: Site, verifier: Schema.String, createdAt: Schema.Finite });

const PendingJson = Schema.fromJsonString(Pending);

type PendingLogin = typeof Pending.Type;

const pendingKey = (state: string): string => `access_oauth_state:${state}`;

const siteOf = (request: Request): Effect.Effect<PendingLogin["site"], AccessOAuthFailed> =>
  Schema.decodeUnknownEffect(Site)(new URL(request.url).searchParams.get("site")).pipe(
    Effect.mapError(() => failedWith("site is not one of the Access sites")),
  );

const authorizationUrl = (
  authorizationEndpoint: string | undefined,
  fields: Readonly<Record<string, string>>,
): Effect.Effect<string, AccessOAuthFailed> =>
  pipe(
    Option.fromNullishOr(authorizationEndpoint),
    Effect.fromOption,
    Effect.mapBoth({
      onFailure: () => failedWith("the authorization server has no authorization endpoint"),
      onSuccess: (endpoint) => new URL(endpoint),
    }),
    Effect.filterOrFail(
      (endpoint) => endpoint.origin === ACCESS_TEAM_ORIGIN,
      (endpoint) => failedWith(`unexpected authorization endpoint ${endpoint.origin}`),
    ),
    Effect.map(
      (endpoint) =>
        `${ACCESS_TEAM_ORIGIN}${endpoint.pathname}?${new URLSearchParams(Rec.toEntries(fields)).toString()}`,
    ),
  );

const remember = (
  env: AppStoreEnv,
  state: string,
  pending: PendingLogin,
): Effect.Effect<void, AccessOAuthFailed> =>
  Schema.encodeEffect(PendingJson)(pending).pipe(
    Effect.flatMap((plaintext) => writeSealed({ env, name: pendingKey(state), plaintext })),
    Effect.mapError(failed),
  );

const login = ({ request, env }: RouteInput): Effect.Effect<Response, AccessOAuthFailed> =>
  Effect.gen(function* startLogin() {
    const site = yield* siteOf(request);
    const connection = yield* connect({ env, site });
    const state = generateRandomState();
    const verifier = generateRandomCodeVerifier();
    const challenge = yield* promised(() => calculatePKCECodeChallenge(verifier));
    const createdAt = yield* Clock.currentTimeMillis;
    yield* remember(env, state, { site, verifier, createdAt });
    const url = yield* authorizationUrl(connection.server.authorization_endpoint, {
      client_id: connection.client.client_id,
      redirect_uri: CALLBACK_URL,
      response_type: "code",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      resource: resourceOf(site),
    });
    return new Response("", { status: FOUND, headers: { location: url } });
  });

const openPending = (
  env: AppStoreEnv,
  state: string,
  stored: string,
): Effect.Effect<PendingLogin, AccessOAuthFailed> =>
  unseal({ key: env.SEAL_KEY, name: pendingKey(state), stored }).pipe(
    Effect.flatMap(({ plaintext }) => Schema.decodeEffect(PendingJson)(plaintext)),
    Effect.mapError(failed),
  );

const takePending = (
  env: AppStoreEnv,
  state: string,
): Effect.Effect<PendingLogin, AccessOAuthFailed> =>
  Effect.gen(function* take() {
    const name = pendingKey(state);
    const stored = yield* readRow({ env, name }).pipe(
      Effect.map(Option.filter((value) => value !== CONSUMED)),
      Effect.flatMap(Effect.fromOption),
      Effect.mapError(() => failedWith("the login state is unknown or already used")),
    );
    const pending = yield* openPending(env, state, stored);
    const taken = yield* swapRow({ env, name, expected: Option.some(stored), value: CONSUMED });
    const now = yield* Clock.currentTimeMillis;
    if (!taken || now - pending.createdAt > PENDING_LIFETIME_MS) {
      return yield* failedWith("the login state was used or expired");
    }
    return pending;
  });

type TakenLogin = Readonly<{
  env: AppStoreEnv;
  callbackUrl: string;
  state: string;
  pending: PendingLogin;
}>;

const exchange = ({
  env,
  callbackUrl,
  state,
  pending,
}: TakenLogin): Effect.Effect<
  Awaited<ReturnType<typeof processAuthorizationCodeResponse>>,
  AccessOAuthFailed
> =>
  connect({ env, site: pending.site }).pipe(
    Effect.flatMap(({ server, client }) =>
      Effect.try({
        try: () => validateAuthResponse(server, client, new URL(callbackUrl), state),
        catch: failed,
      }).pipe(
        Effect.flatMap((parameters) =>
          promised(() =>
            authorizationCodeGrantRequest(
              server,
              client,
              noClientAuthentication(),
              parameters,
              CALLBACK_URL,
              pending.verifier,
              {
                additionalParameters: { resource: resourceOf(pending.site) },
              },
            ),
          ),
        ),
        Effect.flatMap((response) =>
          promised(() => processAuthorizationCodeResponse(server, client, response)),
        ),
      ),
    ),
  );

const callback = ({ request, env }: RouteInput): Effect.Effect<Response, AccessOAuthFailed> =>
  Effect.gen(function* finishLogin() {
    const callbackUrl = request.url;
    const state = new URL(callbackUrl).searchParams.get("state") ?? CONSUMED;
    const pending = yield* takePending(env, state);
    const tokens = yield* exchange({ env, callbackUrl, state, pending });
    const grant = yield* grantFrom({ tokens, previous: Option.none() });
    yield* saveGrant({ env, site: pending.site, expected: Option.none(), grant });
    yield* Effect.logInfo("access_oauth.granted").pipe(Effect.annotateLogs({ site: pending.site }));
    return new Response(`${pending.site} に接続しました`, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  });

const LOGIN_URLS = pipe(
  ACCESS_SITES,
  Arr.map((site) => loginUrlOf(site)),
);

const rejectionOf = (message: string): Response =>
  new Response(
    Arr.join([`ログインに失敗しました: ${message}`, "最初からやり直す:", ...LOGIN_URLS], "\n"),
    {
      status: BAD_REQUEST,
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );

const rejected = ({ message }: Readonly<{ message: string }>): Effect.Effect<Response> =>
  Effect.logWarning("access_oauth.rejected").pipe(
    Effect.annotateLogs({ reason: message }),
    Effect.as(rejectionOf(message)),
  );

const HANDLERS: Readonly<
  Record<string, (input: RouteInput) => Effect.Effect<Response, AccessOAuthFailed>>
> = {
  [`GET ${LOGIN_PATH}`]: login,
  [`GET ${CALLBACK_PATH}`]: callback,
};

const accessOAuthRoute = (input: RouteInput): Option.Option<Effect.Effect<Response>> =>
  pipe(
    Option.fromNullishOr(
      HANDLERS[`${input.request.method} ${new URL(input.request.url).pathname}`],
    ),
    Option.map((handle) => handle(input).pipe(Effect.catchTag("AccessOAuthFailed", rejected))),
  );

export { Site, accessOAuthRoute };

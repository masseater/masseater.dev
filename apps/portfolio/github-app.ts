import { Credentials, DEFAULT_API_BASE_URL } from "@distilled.cloud/github/Credentials";
import { Octokit } from "@octokit/rest";
import { Effect, Layer, Option, Redacted, Schema, String as Str, pipe } from "effect";
import githubAppJwt from "universal-github-app-jwt";

import { GITHUB_APP_NAME } from "./app-name.ts";
import { GITHUB_APP_PERMISSIONS } from "./credential-grants.ts";
import { OWNER_ID } from "./github-oidc.ts";

const APP_KEY = "app";
const SETUP_PATH = "/github-app";
const FINISH_PATH = `${SETUP_PATH}/callback`;
const HOMEPAGE = "https://masseater.dev";
const INSTALL_URL = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`;
const CONFLICT = 409;
const FORBIDDEN = 403;

type GitHubAppEnv = Readonly<{ GITHUB_APP: Readonly<Pick<D1Database, "prepare">> }>;

type RouteInput = Readonly<{ request: Request; env: GitHubAppEnv }>;

const taggedError = Schema.TaggedError;

class GitHubAppFailed extends taggedError<GitHubAppFailed, { readonly brand: unique symbol }>()(
  "GitHubAppFailed",
  { reason: Schema.String },
) {}

const StoredApp = Schema.Struct({ id: Schema.Finite, slug: Schema.String, pem: Schema.String });

const StoredAppJson = Schema.fromJsonString(StoredApp);

const UnknownJson = Schema.fromJsonString(Schema.Unknown);

const Conversion = Schema.Struct({
  id: Schema.Finite,
  slug: Schema.String,
  pem: Schema.String,
  owner: Schema.Struct({ id: Schema.Finite }),
});

const failed = (error: unknown): GitHubAppFailed => GitHubAppFailed.make({ reason: String(error) });

const readApp = (
  env: GitHubAppEnv,
): Effect.Effect<Option.Option<typeof StoredApp.Type>, GitHubAppFailed> =>
  Effect.promise(() =>
    env.GITHUB_APP.prepare("SELECT value FROM github_app WHERE key = ?")
      .bind(APP_KEY)
      .first<string>("value"),
  ).pipe(
    Effect.flatMap((json) =>
      Option.match(Option.fromNullishOr(json), {
        onNone: () => Effect.succeedNone,
        onSome: (stored) => Schema.decodeEffect(StoredAppJson)(stored).pipe(Effect.asSome),
      }),
    ),
    Effect.mapError(failed),
  );

const appJwt = (env: GitHubAppEnv): Effect.Effect<string, GitHubAppFailed> =>
  readApp(env).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(GitHubAppFailed.make({ reason: "GitHub App is not set up" })),
        onSome: (app) =>
          Effect.tryPromise({
            try: () => githubAppJwt({ id: app.id, privateKey: app.pem }),
            catch: failed,
          }),
      }),
    ),
    Effect.map(({ token }) => token),
  );

const gitHubAppCredentials = (env: GitHubAppEnv): Layer.Layer<Credentials> =>
  Layer.succeed(
    Credentials,
    appJwt(env).pipe(
      Effect.map((token) => ({
        token: Redacted.make(token),
        apiBaseUrl: DEFAULT_API_BASE_URL,
        userAgent: GITHUB_APP_NAME,
      })),
      Effect.orDie,
    ),
  );

const escapeAttribute = (value: string): string =>
  pipe(
    value,
    Str.replaceAll("&", "&amp;"),
    Str.replaceAll("'", "&#39;"),
    Str.replaceAll("<", "&lt;"),
  );

const page = (body: string): Response =>
  new Response(`<!doctype html><meta charset="utf-8"><title>${GITHUB_APP_NAME}</title>${body}`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const installPage = (): Response => page(`<a href="${INSTALL_URL}">Install ${GITHUB_APP_NAME}</a>`);

const setupPage = (origin: string): Effect.Effect<Response, GitHubAppFailed> =>
  Schema.encodeEffect(UnknownJson)({
    name: GITHUB_APP_NAME,
    url: HOMEPAGE,
    public: false,
    redirect_url: `${origin}${FINISH_PATH}`,
    hook_attributes: { url: `${origin}${SETUP_PATH}`, active: false },
    default_permissions: GITHUB_APP_PERMISSIONS,
    default_events: [],
  }).pipe(
    Effect.mapBoth({
      onSuccess: (manifest) =>
        page(
          `<form method="post" action="https://github.com/settings/apps/new"><input type="hidden" name="manifest" value='${escapeAttribute(manifest)}'><button>Create ${GITHUB_APP_NAME}</button></form>`,
        ),
      onFailure: failed,
    }),
  );

const setup = ({ request, env }: RouteInput): Effect.Effect<Response, GitHubAppFailed> =>
  readApp(env).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => setupPage(new URL(request.url).origin),
        onSome: () => Effect.succeed(installPage()),
      }),
    ),
  );

const convert = (code: string): Effect.Effect<typeof Conversion.Type, GitHubAppFailed> =>
  Effect.tryPromise({
    try: () => new Octokit({ userAgent: GITHUB_APP_NAME }).rest.apps.createFromManifest({ code }),
    catch: failed,
  }).pipe(
    Effect.flatMap(({ data }) =>
      Schema.decodeUnknownEffect(Conversion)(data).pipe(Effect.mapError(failed)),
    ),
  );

const isOwnedApp = (app: typeof Conversion.Type): boolean =>
  String(app.owner.id) === OWNER_ID && app.slug === GITHUB_APP_NAME;

const logCreated = (appId: number): Effect.Effect<void> =>
  Effect.logInfo("github_app.created").pipe(Effect.annotateLogs({ appId }));

const storeApp = (
  env: GitHubAppEnv,
  app: typeof Conversion.Type,
): Effect.Effect<Response, GitHubAppFailed> =>
  Schema.encodeEffect(StoredAppJson)({ id: app.id, slug: app.slug, pem: app.pem }).pipe(
    Effect.mapError(failed),
    Effect.flatMap((json) =>
      Effect.promise(() =>
        env.GITHUB_APP.prepare(
          "INSERT INTO github_app (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        )
          .bind(APP_KEY, json)
          .run(),
      ),
    ),
    Effect.andThen(logCreated(app.id)),
    Effect.as(installPage()),
  );

const register = (
  input: RouteInput,
  app: typeof Conversion.Type,
): Effect.Effect<Response, GitHubAppFailed> => {
  if (isOwnedApp(app)) {
    return storeApp(input.env, app);
  }
  return Effect.logWarning("github_app.rejected").pipe(
    Effect.annotateLogs({ ownerId: app.owner.id, slug: app.slug }),
    Effect.as(new Response("", { status: FORBIDDEN })),
  );
};

const finishSetup = (input: RouteInput): Effect.Effect<Response, GitHubAppFailed> =>
  readApp(input.env).pipe(
    Effect.flatMap(
      Option.match({
        onSome: () => Effect.succeed(new Response("", { status: CONFLICT })),
        onNone: () =>
          convert(new URL(input.request.url).searchParams.get("code") ?? "").pipe(
            Effect.flatMap((app) => register(input, app)),
          ),
      }),
    ),
  );

const HANDLERS: Readonly<
  Record<string, (input: RouteInput) => Effect.Effect<Response, GitHubAppFailed>>
> = {
  [SETUP_PATH]: setup,
  [FINISH_PATH]: finishSetup,
};

const route = (input: RouteInput): Option.Option<Effect.Effect<Response, GitHubAppFailed>> =>
  pipe(
    Option.liftPredicate(input.request, (request) => request.method === "GET"),
    Option.flatMap((request) => Option.fromNullishOr(HANDLERS[new URL(request.url).pathname])),
    Option.map((handle) => handle(input)),
  );

export { GitHubAppFailed, failed, gitHubAppCredentials, readApp, route };
export type { GitHubAppEnv, RouteInput };

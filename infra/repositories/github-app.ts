import { Credentials, DEFAULT_API_BASE_URL } from "@distilled.cloud/github/Credentials";
import { Octokit } from "@octokit/rest";
import { Effect, Layer, Option, Redacted, Schema, String as Str, pipe } from "effect";
import githubAppJwt from "universal-github-app-jwt";

import { readSealed, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import { GITHUB_APP_NAME } from "./broker-names.ts";
import { GITHUB_APP_PERMISSIONS } from "./credential-grants.ts";
import { OWNER_ID, verify } from "./github-oidc.ts";
import { toPkcs8 } from "./pkcs8.ts";

const APP_KEY = "app";
const SETUP_PATH = "/github-app";
const FINISH_PATH = `${SETUP_PATH}/callback`;
const IMPORT_PATH = `${SETUP_PATH}/import`;
const HOMEPAGE = "https://masseater.dev";
const INSTALL_URL = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`;
const CONFLICT = 409;
const FORBIDDEN = 403;

type GitHubAppEnv = Readonly<{
  GITHUB_APP: Readonly<Pick<D1Database, "prepare">>;
  SEAL_KEY: string;
}>;

type RouteInput = Readonly<{ request: Request; env: AppStoreEnv }>;

const taggedError = Schema.TaggedError;

class GitHubAppFailed extends taggedError<GitHubAppFailed, { readonly brand: unique symbol }>()(
  "GitHubAppFailed",
  { message: Schema.String },
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

const ImportBody = Schema.Struct({ id: Schema.Finite, pem: Schema.String });

const AuthenticatedApp = Schema.Struct({
  slug: Schema.String,
  owner: Schema.Struct({ id: Schema.Finite }),
});

const failed = (error: unknown): GitHubAppFailed =>
  GitHubAppFailed.make({ message: String(error) });

const decodeStored = (json: string): Effect.Effect<typeof StoredApp.Type, GitHubAppFailed> =>
  Schema.decodeEffect(StoredAppJson)(json).pipe(
    Effect.mapError(() => GitHubAppFailed.make({ message: "the stored GitHub App is malformed" })),
  );

const readApp = (
  env: AppStoreEnv,
): Effect.Effect<Option.Option<typeof StoredApp.Type>, GitHubAppFailed> =>
  readSealed({ env, name: APP_KEY }).pipe(
    Effect.mapError(failed),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (json) => decodeStored(json).pipe(Effect.asSome),
      }),
    ),
  );

const appJwt = (env: AppStoreEnv): Effect.Effect<string, GitHubAppFailed> =>
  readApp(env).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(GitHubAppFailed.make({ message: "GitHub App is not set up" })),
        onSome: (app) =>
          toPkcs8(app.pem).pipe(
            Effect.mapError(failed),
            Effect.flatMap((privateKey) =>
              Effect.tryPromise({
                try: () => githubAppJwt({ id: app.id, privateKey }),
                catch: failed,
              }),
            ),
          ),
      }),
    ),
    Effect.map(({ token }) => token),
  );

const gitHubAppCredentials = (env: AppStoreEnv): Layer.Layer<Credentials> =>
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
  env: AppStoreEnv,
  app: typeof Conversion.Type,
): Effect.Effect<Response, GitHubAppFailed> =>
  Schema.encodeEffect(StoredAppJson)({ id: app.id, slug: app.slug, pem: app.pem }).pipe(
    Effect.flatMap((plaintext) => writeSealed({ env, name: APP_KEY, plaintext })),
    Effect.mapError(failed),
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

const authenticate = (
  body: typeof ImportBody.Type,
): Effect.Effect<typeof Conversion.Type, GitHubAppFailed> =>
  toPkcs8(body.pem).pipe(
    Effect.flatMap((privateKey) =>
      Effect.tryPromise({ try: () => githubAppJwt({ id: body.id, privateKey }), catch: failed }),
    ),
    Effect.flatMap(({ token }) =>
      Effect.tryPromise({
        try: () =>
          new Octokit({ auth: token, userAgent: GITHUB_APP_NAME }).rest.apps.getAuthenticated(),
        catch: failed,
      }),
    ),
    Effect.flatMap(({ data }) => Schema.decodeUnknownEffect(AuthenticatedApp)(data)),
    Effect.mapBoth({ onSuccess: (app) => ({ ...app, ...body }), onFailure: failed }),
  );

const malformedImport = (): GitHubAppFailed =>
  GitHubAppFailed.make({ message: "the import body is not a JSON object with id and pem" });

const importBody = (request: Request): Effect.Effect<typeof ImportBody.Type, GitHubAppFailed> =>
  Effect.tryPromise({ try: () => request.json(), catch: malformedImport }).pipe(
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(ImportBody)(body).pipe(Effect.mapError(malformedImport)),
    ),
  );

const importApp = (input: RouteInput): Effect.Effect<Response, GitHubAppFailed> =>
  verify(input.request).pipe(
    Effect.mapError(failed),
    Effect.andThen(importBody(input.request)),
    Effect.flatMap(authenticate),
    Effect.flatMap((app) => register(input, app)),
  );

const HANDLERS: Readonly<
  Record<string, (input: RouteInput) => Effect.Effect<Response, GitHubAppFailed>>
> = {
  [`GET ${SETUP_PATH}`]: setup,
  [`GET ${FINISH_PATH}`]: finishSetup,
  [`POST ${IMPORT_PATH}`]: importApp,
};

const route = (input: RouteInput): Option.Option<Effect.Effect<Response, GitHubAppFailed>> =>
  pipe(
    Option.fromNullishOr(
      HANDLERS[`${input.request.method} ${new URL(input.request.url).pathname}`],
    ),
    Option.map((handle) => handle(input)),
  );

export { GitHubAppFailed, gitHubAppCredentials, readApp, route };
export type { GitHubAppEnv, RouteInput };

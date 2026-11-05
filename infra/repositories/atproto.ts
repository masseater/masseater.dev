import { AtpAgent } from "@atproto/api";
import { Effect, Option, Schema, pipe } from "effect";

import type { GitHubAppEnv, RouteInput } from "./github-app.ts";

const ATPROTO_DID = "did:plc:sz2kxumpsjbch3kgnsjjed5z";
const ATPROTO_SERVICE = "https://bsky.social";
const APP_PASSWORD_KEY = "atp_app_password";
const APP_PASSWORD_PATH = "/atproto/app-password";
const NO_CONTENT = 204;
const UNAUTHORIZED = 401;

const Submission = Schema.fromJsonString(Schema.Struct({ password: Schema.NonEmptyString }));

const decodeSubmission = Schema.decodeEffect(Submission);

const taggedError = Schema.TaggedError;

class SignInFailed extends taggedError<SignInFailed, { readonly brand: unique symbol }>()(
  "SignInFailed",
  { message: Schema.String },
) {}

const signIn = (password: string): Effect.Effect<void, SignInFailed> =>
  Effect.tryPromise({
    try: () =>
      new AtpAgent({ service: ATPROTO_SERVICE }).login({ identifier: ATPROTO_DID, password }),
    catch: (error) => SignInFailed.make({ message: String(error) }),
  }).pipe(
    Effect.filterOrFail(
      ({ data }) => data.did === ATPROTO_DID,
      ({ data }) => SignInFailed.make({ message: `signed in as ${data.did}` }),
    ),
    Effect.asVoid,
  );

const storePassword = (env: GitHubAppEnv, password: string): Effect.Effect<void> =>
  Effect.promise(() =>
    env.GITHUB_APP.prepare(
      "INSERT INTO github_app (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    )
      .bind(APP_PASSWORD_KEY, password)
      .run(),
  ).pipe(Effect.andThen(Effect.logInfo("atproto.app_password_stored")));

const submit = (request: Request, env: GitHubAppEnv): Effect.Effect<Response> =>
  Effect.promise(() => request.text()).pipe(
    Effect.flatMap(decodeSubmission),
    Effect.tap(({ password }) => signIn(password)),
    Effect.flatMap(({ password }) => storePassword(env, password)),
    Effect.as(new Response("", { status: NO_CONTENT })),
    Effect.catchCause((cause) =>
      Effect.logWarning("atproto.app_password_rejected", cause).pipe(
        Effect.as(new Response("", { status: UNAUTHORIZED })),
      ),
    ),
  );

const atprotoRoute = ({ request, env }: RouteInput): Option.Option<Effect.Effect<Response>> =>
  pipe(
    Option.liftPredicate(
      request,
      (candidate) =>
        candidate.method === "POST" && new URL(candidate.url).pathname === APP_PASSWORD_PATH,
    ),
    Option.map((matched) => submit(matched, env)),
  );

const readAppPassword = (env: GitHubAppEnv): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    env.GITHUB_APP.prepare("SELECT value FROM github_app WHERE key = ?")
      .bind(APP_PASSWORD_KEY)
      .first<string>("value"),
  ).pipe(Effect.map(Option.fromNullishOr));

const issueAppPassword = ({
  env,
  granted,
}: Readonly<{ env: GitHubAppEnv; granted: boolean }>): Effect.Effect<
  Option.Option<Readonly<{ atpAppPassword: string }>>
> =>
  pipe(
    Option.liftPredicate(env, () => granted),
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: (granter) =>
        readAppPassword(granter).pipe(
          Effect.map(Option.map((atpAppPassword) => ({ atpAppPassword }))),
        ),
    }),
  );

export { atprotoRoute, issueAppPassword };

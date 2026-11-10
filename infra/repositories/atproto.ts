import { AtpAgent } from "@atproto/api";
import { Clock, Effect, Option, Schema, pipe } from "effect";

import { readRow, readSealed, swapRow, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import { admit } from "./attempt-window.ts";
import type { RouteInput } from "./github-app.ts";
import type { SealFailed } from "./sealed-value.ts";

const ATPROTO_DID = "did:plc:sz2kxumpsjbch3kgnsjjed5z";
const ATPROTO_SERVICE = "https://bsky.social";
const APP_PASSWORD_KEY = "atp_app_password";
const ATTEMPTS_KEY = "atp_attempts";
const APP_PASSWORD_PATH = "/atproto/app-password";
const NO_CONTENT = 204;
const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

const Submission = Schema.fromJsonString(Schema.Struct({ password: Schema.NonEmptyString }));

const decodeSubmission = Schema.decodeEffect(Submission);

const taggedError = Schema.TaggedError;

class SignInFailed extends taggedError<SignInFailed, { readonly brand: unique symbol }>()(
  "SignInFailed",
  { message: Schema.String },
) {}

const submitted = (body: string): Effect.Effect<Readonly<{ password: string }>, SignInFailed> =>
  decodeSubmission(body).pipe(
    Effect.mapError(() =>
      SignInFailed.make({ message: "the submission is not a JSON object with a password" }),
    ),
  );

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

const storePassword = (env: AppStoreEnv, password: string): Effect.Effect<void, SealFailed> =>
  writeSealed({ env, name: APP_PASSWORD_KEY, plaintext: password }).pipe(
    Effect.andThen(Effect.logInfo("atproto.app_password_stored")),
  );

const admitAttempt = (env: AppStoreEnv): Effect.Effect<boolean> =>
  Effect.gen(function* countAttempt() {
    const attempts = { env, name: ATTEMPTS_KEY };
    const now = yield* Clock.currentTimeMillis;
    const stored = yield* readRow(attempts);
    const admission = admit({ now, stored });
    if (admission.status === "limited") {
      return false;
    }
    return yield* swapRow({ ...attempts, expected: stored, value: admission.stored });
  });

const limited: Effect.Effect<Response> = Effect.logWarning("atproto.app_password_limited").pipe(
  Effect.map(() => new Response("", { status: TOO_MANY_REQUESTS })),
);

const accept = (
  request: Request,
  env: AppStoreEnv,
): Effect.Effect<Response, SealFailed | SignInFailed> =>
  Effect.promise(() => request.text()).pipe(
    Effect.flatMap(submitted),
    Effect.tap(({ password }) => signIn(password)),
    Effect.flatMap(({ password }) => storePassword(env, password)),
    Effect.as(new Response("", { status: NO_CONTENT })),
  );

const submit = (request: Request, env: AppStoreEnv): Effect.Effect<Response> =>
  admitAttempt(env).pipe(
    Effect.flatMap((admitted) => {
      if (admitted) {
        return accept(request, env);
      }
      return limited;
    }),
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

const readAppPassword = (env: AppStoreEnv): Effect.Effect<Option.Option<string>> =>
  readSealed({ env, name: APP_PASSWORD_KEY }).pipe(
    Effect.catchTag("SealFailed", () => Effect.succeedNone),
  );

const issueAppPassword = ({
  env,
  granted,
}: Readonly<{ env: AppStoreEnv; granted: boolean }>): Effect.Effect<
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

import { Effect, Logger, ManagedRuntime, Schema, String as Str, pipe } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { CI_TELEMETRY_AUDIENCE } from "./app-name.ts";
import { OWNER_ID } from "./github-oidc.ts";

const ISSUER = "https://token.actions.githubusercontent.com";

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

const Claims = Schema.Struct({
  repository: Schema.String,
  repository_owner_id: Schema.String,
  workflow: Schema.String,
  run_id: Schema.String,
  run_attempt: Schema.String,
  ref: Schema.String,
  sha: Schema.String,
  event_name: Schema.String,
});

const Timed = Schema.Struct({
  name: Schema.String,
  conclusion: Schema.NullOr(Schema.String),
  started_at: Schema.String,
  completed_at: Schema.String,
});

const Job = Schema.Struct({
  ...Timed.fields,
  id: Schema.Finite,
  runner_name: Schema.NullOr(Schema.String),
  steps: Schema.Array(Schema.Struct({ ...Timed.fields, number: Schema.Finite })),
});

const Payload = Schema.Struct({ jobs: Schema.Array(Job) });

type Run = Readonly<Record<string, string>>;

const taggedError = Schema.TaggedError;

class Unauthorized extends taggedError<Unauthorized, { readonly brand: unique symbol }>()(
  "Unauthorized",
  {
    reason: Schema.String,
  },
) {}

const runtime = ManagedRuntime.make(
  Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]),
);

const bearer = (request: Request): string =>
  Str.replace(/^Bearer /u, "")(request.headers.get("authorization") ?? "");

const verify = (
  request: Request,
): Effect.Effect<typeof Claims.Type, Unauthorized | Schema.SchemaError> =>
  Effect.gen(function* verifyClaims() {
    const { payload } = yield* Effect.tryPromise({
      try: () =>
        jwtVerify(bearer(request), jwks, { issuer: ISSUER, audience: CI_TELEMETRY_AUDIENCE }),
      catch: (error) => Unauthorized.make({ reason: String(error) }),
    });
    const claims = yield* Schema.decodeUnknownEffect(Claims)(payload);
    if (claims.repository_owner_id !== OWNER_ID) {
      return yield* Unauthorized.make({ reason: `unexpected repository ${claims.repository}` });
    }
    return claims;
  });

const timing = (timed: typeof Timed.Type): Readonly<Record<string, unknown>> => ({
  name: timed.name,
  conclusion: timed.conclusion,
  startedAt: timed.started_at,
  completedAt: timed.completed_at,
  durationMs: Date.parse(timed.completed_at) - Date.parse(timed.started_at),
});

const logJob = (run: Run, job: typeof Job.Type): Effect.Effect<void> =>
  Effect.gen(function* logJobAndSteps() {
    const context = { ...run, job: job.name, jobId: job.id, runner: job.runner_name };
    yield* Effect.logInfo("ci.job").pipe(Effect.annotateLogs({ ...context, ...timing(job) }));
    yield* pipe(
      job.steps,
      Effect.forEach((step) =>
        Effect.logInfo("ci.step").pipe(
          Effect.annotateLogs({ ...context, ...timing(step), stepNumber: step.number }),
        ),
      ),
    );
  });

const toRun = (claims: typeof Claims.Type): Run => ({
  repository: claims.repository,
  workflow: claims.workflow,
  runId: claims.run_id,
  runAttempt: claims.run_attempt,
  ref: claims.ref,
  sha: claims.sha,
  event: claims.event_name,
});

const record = (request: Request): Effect.Effect<Response> =>
  Effect.gen(function* recordRun() {
    const claims = yield* verify(request);
    const body = yield* Effect.tryPromise(() => request.json());
    const { jobs } = yield* Schema.decodeUnknownEffect(Payload)(body);
    yield* pipe(
      jobs,
      Effect.forEach((job) => logJob(toRun(claims), job)),
    );
    return new Response("", { status: 202 });
  }).pipe(
    Effect.catchTag("Unauthorized", (unauthorized) =>
      Effect.logWarning("ci.unauthorized").pipe(
        Effect.annotateLogs({ reason: unauthorized.reason }),
        Effect.as(new Response("", { status: 401 })),
      ),
    ),
    Effect.catchCause((cause) =>
      Effect.logError("ci.rejected", cause).pipe(Effect.as(new Response("", { status: 400 }))),
    ),
  );

const worker = {
  fetch: (request: Request): Promise<Response> => runtime.runPromise(record(request)),
};

export default worker;

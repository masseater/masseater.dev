import { OWNER_ID } from "@masseater.dev/repositories/github-oidc";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger, Schema, String as Str } from "effect";
import { jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";

import { UnreadableBody } from "./unreadable-body.ts";

export const ISSUER = "https://token.actions.githubusercontent.com";

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

const runRecord = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const bearer = (request: Request): string =>
  Str.replace(/^Bearer /u, "")(request.headers.get("authorization") ?? "");

interface Trust {
  readonly keys: JWTVerifyGetKey;
  readonly audience: string;
}

const verify =
  ({ keys, audience }: Trust) =>
  (request: Request): Effect.Effect<typeof Claims.Type, Unauthorized | Schema.SchemaError> =>
    Effect.gen(function* verifyClaims() {
      const { payload } = yield* Effect.tryPromise({
        try: () => jwtVerify(bearer(request), keys, { issuer: ISSUER, audience }),
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
    yield* Effect.forEach(
      job.steps,
      (step) =>
        Effect.logInfo("ci.step").pipe(
          Effect.annotateLogs({ ...context, ...timing(step), stepNumber: step.number }),
        ),
      { concurrency: 1 },
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

const record =
  (trust: Trust) =>
  (request: Request): Effect.Effect<Response> =>
    Effect.gen(function* recordRun() {
      const claims = yield* verify(trust)(request);
      const body = yield* Effect.tryPromise({
        try: () => request.json(),
        catch: (cause) => UnreadableBody.make({ message: String(cause) }),
      });
      const { jobs } = yield* Schema.decodeUnknownEffect(Payload)(body);
      yield* Effect.forEach(jobs, (job) => logJob(toRun(claims), job), { concurrency: 1 });
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

export const ciTelemetryWorker = (
  trust: Trust,
): Readonly<{ fetch: (request: Request) => Promise<Response> }> => ({
  fetch: (request) => runRecord(record(trust)(request)),
});

import { Effect, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { readSealed, writeSealed } from "#/shared/api/index.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

const ROUTINE_KEY = "claude_routine";
const FIRE_BASE = "https://api.anthropic.com/v1/claude_code/routines/";
const ANTHROPIC_VERSION = "2023-06-01";
const ROUTINE_BETA = "experimental-cc-routine-2026-04-01";

const Project = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,39}$/u));

const RoutineSchema = Schema.Struct({
  triggerId: Schema.String.check(Schema.isPattern(/^trig_[0-9A-Za-z]+$/u)),
  token: Schema.String.check(Schema.isPattern(/^sk-ant-oat01-[0-9A-Za-z_-]+$/u)),
});

const Registration = Schema.Struct({
  ...RoutineSchema.fields,
  project: Schema.optionalKey(Project),
});

type Routine = typeof RoutineSchema.Type;

const RoutineJson = Schema.fromJsonString(RoutineSchema);

const WakeBody = Schema.Struct({});

export type FireOutcome = "fired" | "missing" | "rejected";

export interface ClaudeRoutineRpc extends Rpc.WorkerEntrypointBranded {
  register: (routine: unknown) => Promise<boolean>;
  fire: (project?: string) => Promise<FireOutcome>;
}

const rowOf = (project: Option.Option<string>): string =>
  Option.match(project, {
    onNone: () => ROUTINE_KEY,
    onSome: (name) => `${ROUTINE_KEY}:${name}`,
  });

export const registerRoutine = ({
  env,
  routine,
}: Readonly<{ env: AppStoreEnv; routine: unknown }>): Effect.Effect<boolean> =>
  Schema.decodeUnknownEffect(Registration)(routine).pipe(
    Effect.flatMap(({ project, ...valid }) =>
      Schema.encodeEffect(RoutineJson)(valid).pipe(
        Effect.flatMap((plaintext) =>
          writeSealed({ env, name: rowOf(Option.fromNullishOr(project)), plaintext }),
        ),
      ),
    ),
    Effect.andThen(Effect.logInfo("claude_routine.registered")),
    Effect.as(true),
    Effect.catchCause((cause) =>
      Effect.logWarning("claude_routine.register_rejected", cause).pipe(Effect.as(false)),
    ),
  );

const readRoutine = ({
  env,
  project,
}: Readonly<{ env: AppStoreEnv; project: Option.Option<string> }>): Effect.Effect<
  Option.Option<Routine>
> =>
  readSealed({ env, name: rowOf(project) }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (plaintext) => Schema.decodeEffect(RoutineJson)(plaintext).pipe(Effect.asSome),
      }),
    ),
    Effect.catchCause((cause) =>
      Effect.logError("claude_routine.unreadable", cause).pipe(Effect.as(Option.none<Routine>())),
    ),
  );

const post = (routine: Routine): Effect.Effect<FireOutcome, never, HttpClient.HttpClient> =>
  HttpClientRequest.post(`${FIRE_BASE}${routine.triggerId}/fire`).pipe(
    HttpClientRequest.bearerToken(routine.token),
    HttpClientRequest.setHeaders({
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-beta": ROUTINE_BETA,
    }),
    HttpClientRequest.schemaBodyJson(WakeBody)({}),
    Effect.flatMap((request) => HttpClient.execute(request)),
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.as<FireOutcome>("fired"),
    Effect.catchCause((cause) =>
      Effect.logWarning("claude_routine.fire_failed", cause).pipe(
        Effect.as<FireOutcome>("rejected"),
      ),
    ),
  );

/** @internal */
export const fireRoutine = Effect.fn("claude_routine.fire")(function* fire(
  env: AppStoreEnv,
  project: Option.Option<string>,
) {
  const named = project.pipe(Option.filter(Schema.is(Project)));
  const stored = yield* Option.match(project, {
    onNone: () => readRoutine({ env, project }),
    onSome: () =>
      Option.match(named, {
        onNone: () => Effect.succeedNone,
        onSome: () => readRoutine({ env, project: named }),
      }),
  });
  return yield* Option.match(stored, {
    onNone: () =>
      Effect.logWarning("claude_routine.missing").pipe(Effect.as<FireOutcome>("missing")),
    onSome: post,
  });
});

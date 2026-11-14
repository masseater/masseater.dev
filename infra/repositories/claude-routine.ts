import { Effect, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { readSealed, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";

const ROUTINE_KEY = "claude_routine";
const FIRE_BASE = "https://api.anthropic.com/v1/claude_code/routines/";
const ANTHROPIC_VERSION = "2023-06-01";
const ROUTINE_BETA = "experimental-cc-routine-2026-04-01";
const WAKE_TEXT = "sundries に新しい依頼があります。";

const RoutineSchema = Schema.Struct({
  triggerId: Schema.String.check(Schema.isPattern(/^trig_[0-9A-Za-z]+$/u)),
  token: Schema.String.check(Schema.isPattern(/^sk-ant-oat01-[0-9A-Za-z_-]+$/u)),
});

type Routine = typeof RoutineSchema.Type;

const RoutineJson = Schema.fromJsonString(RoutineSchema);

const WakeBody = Schema.Struct({ text: Schema.String });

type FireOutcome = "fired" | "missing" | "rejected";

interface ClaudeRoutineRpc extends Rpc.WorkerEntrypointBranded {
  register: (routine: unknown) => Promise<boolean>;
  fire: () => Promise<FireOutcome>;
}

const registerRoutine = ({
  env,
  routine,
}: Readonly<{ env: AppStoreEnv; routine: unknown }>): Effect.Effect<boolean> =>
  Schema.decodeUnknownEffect(RoutineSchema)(routine).pipe(
    Effect.flatMap((valid) => Schema.encodeEffect(RoutineJson)(valid)),
    Effect.flatMap((plaintext) => writeSealed({ env, name: ROUTINE_KEY, plaintext })),
    Effect.andThen(Effect.logInfo("claude_routine.registered")),
    Effect.as(true),
    Effect.catchCause((cause) =>
      Effect.logWarning("claude_routine.register_rejected", cause).pipe(Effect.as(false)),
    ),
  );

const readRoutine = (env: AppStoreEnv): Effect.Effect<Option.Option<Routine>> =>
  readSealed({ env, name: ROUTINE_KEY }).pipe(
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
    HttpClientRequest.schemaBodyJson(WakeBody)({ text: WAKE_TEXT }),
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
const fireRoutine = Effect.fn("claude_routine.fire")(function* fire(env: AppStoreEnv) {
  const routine = yield* readRoutine(env);
  return yield* Option.match(routine, {
    onNone: () =>
      Effect.logWarning("claude_routine.missing").pipe(Effect.as<FireOutcome>("missing")),
    onSome: post,
  });
});

export { fireRoutine, registerRoutine };
export type { ClaudeRoutineRpc, FireOutcome };

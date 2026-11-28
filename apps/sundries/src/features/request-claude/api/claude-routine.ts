import type { ClaudeRoutine } from "@masseater.dev/repositories/credential-broker";
import { Context, Effect, Option } from "effect";

import { brokerFailed } from "#/shared/api/index.ts";

import { markWoken } from "./claude-requests.ts";
import type { RequestsDb } from "./claude-requests.ts";

export type Routine = Readonly<{ triggerId: string; token: string; project?: string }>;

export type Woken = Awaited<ReturnType<ClaudeRoutine["fire"]>>;

export type RoutineBroker = Readonly<{
  fire: (project?: string) => Promise<Woken>;
  register: (routine: Routine) => Promise<boolean>;
}>;

export class RoutineService extends Context.Service<RoutineService, RoutineBroker>()(
  "sundries/features/request-claude/api/claude-routine/RoutineService",
) {}

const fired = Effect.fn("fired")(function* fired(project: Option.Option<string>) {
  const broker = yield* RoutineService;
  return yield* Effect.tryPromise({
    try: () => broker.fire(Option.getOrUndefined(project)),
    catch: brokerFailed,
  });
});

export const wakeProject = (
  project: Option.Option<string>,
): Effect.Effect<Woken, never, RequestsDb | RoutineService> =>
  fired(project).pipe(
    Effect.tap((woke) => Effect.when(markWoken(project), Effect.succeed(woke === "fired"))),
    Effect.catchCause((cause) =>
      Effect.logWarning("claude_routine.wake_failed", cause).pipe(
        Effect.annotateLogs({ project: Option.getOrElse(project, () => "") }),
        Effect.as<Woken>("rejected"),
      ),
    ),
  );

export const registerRoutine = Effect.fn("registerRoutine")(function* registerRoutine(
  routine: Routine,
) {
  const broker = yield* RoutineService;
  const registered = yield* Effect.tryPromise({
    try: () => broker.register(routine),
    catch: brokerFailed,
  });
  return { registered };
});

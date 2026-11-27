import type { ClaudeRoutine } from "@masseater.dev/repositories/credential-broker";
import { Context, Effect } from "effect";

import { brokerFailed } from "#/shared/api/index.ts";

export type Routine = Readonly<{ triggerId: string; token: string }>;

export type Woken = Awaited<ReturnType<ClaudeRoutine["fire"]>>;

export type RoutineBroker = Readonly<{
  fire: () => Promise<Woken>;
  register: (routine: Routine) => Promise<boolean>;
}>;

export class RoutineService extends Context.Service<RoutineService, RoutineBroker>()(
  "sundries/features/request-claude/api/claude-routine/RoutineService",
) {}

const fired = Effect.fn("fired")(function* fired() {
  const broker = yield* RoutineService;
  return yield* Effect.tryPromise({ try: () => broker.fire(), catch: brokerFailed });
});

export const wakeProject: Effect.Effect<Woken, never, RoutineService> = fired().pipe(
  Effect.catchCause((cause) =>
    Effect.logWarning("claude_routine.wake_failed", cause).pipe(Effect.as<Woken>("rejected")),
  ),
);

export const registerRoutine = Effect.fn("registerRoutine")(function* registerRoutine(
  routine: Routine,
) {
  const broker = yield* RoutineService;
  const registered = yield* Effect.tryPromise({
    try: () => broker.register({ triggerId: routine.triggerId, token: routine.token }),
    catch: brokerFailed,
  });
  return { registered };
});

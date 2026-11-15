import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import type { ClaudeRoutine } from "@masseater.dev/repositories/credential-broker.worker";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { brokerFailed } from "#/shared/api";

export type Routine = Readonly<{ triggerId: string; token: string }>;

export type Woken = Awaited<ReturnType<ClaudeRoutine["fire"]>>;

const broker = (): Service<ClaudeRoutine> => env.CLAUDE_ROUTINE;

export const wakeProject: Effect.Effect<Woken> = Effect.tryPromise({
  try: () => broker().fire(),
  catch: brokerFailed,
}).pipe(
  Effect.catchCause((cause) =>
    Effect.logWarning("claude_routine.wake_failed", cause).pipe(Effect.as<Woken>("rejected")),
  ),
);

export const registerRoutine = (
  routine: Routine,
): Effect.Effect<Readonly<{ registered: boolean }>, UpstreamFailed> =>
  Effect.tryPromise({
    try: () => broker().register({ triggerId: routine.triggerId, token: routine.token }),
    catch: brokerFailed,
  }).pipe(Effect.map((registered) => ({ registered })));

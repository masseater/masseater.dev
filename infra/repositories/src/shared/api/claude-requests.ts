import type { ClaudeRequest } from "@masseater.dev/exposure-protocol/claude-requests";
import { Effect, Schema } from "effect";

import type { AppStoreEnv } from "./app-store.ts";

export type QueuedEnv = AppStoreEnv &
  Readonly<{
    CLAUDE_REQUESTS: Readonly<{ send: (request: ClaudeRequest) => Promise<unknown> }>;
  }>;

const taggedError = Schema.TaggedError;

class QueueRefused extends taggedError<QueueRefused, { readonly brand: unique symbol }>()(
  "QueueRefused",
  { reason: Schema.String },
) {}

export const queueRequest = ({
  env,
  request,
}: Readonly<{ env: QueuedEnv; request: ClaudeRequest }>): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => env.CLAUDE_REQUESTS.send(request),
    catch: (cause) => QueueRefused.make({ reason: String(cause) }),
  }).pipe(Effect.orDie, Effect.asVoid);

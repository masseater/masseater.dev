import type { ClaudeRequest } from "@masseater.dev/exposure-protocol/claude-requests";
import { Array as Arr, Effect, Ref, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import type { QueuedEnv } from "#/shared/api/index.ts";
import { memoryStore } from "#/shared/lib/app-store.test.support.ts";

import { nudgeIdleThreads } from "./idle-threads.ts";

const SCHEDULED_AT = Date.parse("2026-11-27T14:30:00Z");
const ONCE = 1;

const queued: Effect.Effect<readonly ClaudeRequest[]> = Effect.gen(function* queueOnce() {
  const sent = yield* Ref.make<readonly ClaudeRequest[]>([]);
  const context = yield* Effect.context();
  const { env: store } = memoryStore();
  const send = (request: ClaudeRequest): Promise<void> =>
    Effect.runPromiseWith(context)(Ref.update(sent, Arr.append(request)));
  const env: QueuedEnv = { ...store, CLAUDE_REQUESTS: { send } };
  yield* nudgeIdleThreads({ env, scheduledTime: SCHEDULED_AT });
  return yield* Ref.get(sent);
});

const SINCE = "idleSince: 2026-11-27T14:00:00.000Z";

test("起動のたびに、前回の起動時刻を idleSince として依頼を 1 件積む", () =>
  Effect.runPromise(
    queued.pipe(
      Effect.tap((requests) =>
        Effect.sync(() => {
          const senders = pipe(
            requests,
            Arr.map(({ sender }) => sender),
          );
          const mentionsSince = pipe(
            requests,
            Arr.every(({ text }) => Str.includes(SINCE)(text)),
          );
          expect(requests).toHaveLength(ONCE);
          expect(senders).toStrictEqual(["idle-threads"]);
          expect(mentionsSince).toBe(true);
        }),
      ),
    ),
  ));

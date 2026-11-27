import type { ClaudeRequest } from "@masseater.dev/exposure-protocol/claude-requests";
import { Array as Arr, Duration, Effect, Ref, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";
import { expect, test } from "vite-plus/test";

import type { Claims } from "#/entities/credential/index.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";
import { memoryStore } from "#/shared/lib/app-store.test.support.ts";

import { wake } from "./red-main.ts";

const CLAIMS: typeof Claims.Type = {
  repository_owner: "masseater",
  repository_owner_id: "62135405",
  repository: "masseater/ecosystems",
  repository_id: "1473813525",
  event_name: "push",
  ref: "refs/heads/main",
  run_id: "11",
  run_attempt: "1",
  workflow_ref: "masseater/ecosystems/.github/workflows/verify.yml@refs/heads/main",
};

const TEN_MINUTES = Duration.fromInputUnsafe("10 minutes");
const AN_HOUR = Duration.fromInputUnsafe("1 hour");
const ONCE = 1;
const TWICE = 2;

type Queue = Readonly<{ env: QueuedEnv; sent: Ref.Ref<readonly ClaudeRequest[]> }>;

const withQueue: Effect.Effect<Queue> = Effect.gen(function* withQueue() {
  const sent = yield* Ref.make<readonly ClaudeRequest[]>([]);
  const context = yield* Effect.context();
  const { env: store } = memoryStore();
  const send = (request: ClaudeRequest): Promise<void> =>
    Effect.runPromiseWith(context)(Ref.update(sent, Arr.append(request)));
  return { env: { ...store, CLAUDE_REQUESTS: { send } }, sent };
});

const clock = TestClock.layer();

const run = <Value>(effect: Effect.Effect<Value>): Promise<Value> =>
  Effect.runPromise(Effect.provide(effect, clock));

test("main の verify の失敗を、実行の URL つきで一度だけ依頼に積む", () =>
  run(
    Effect.gen(function* firstFailure() {
      const { env, sent } = yield* withQueue;
      yield* wake({ env, claims: CLAIMS });
      const requests = yield* Ref.get(sent);
      const mentionsRun = pipe(
        requests,
        Arr.every(({ text }) =>
          Str.includes("https://github.com/masseater/ecosystems/actions/runs/11")(text),
        ),
      );
      const senders = pipe(
        requests,
        Arr.map(({ sender }) => sender),
      );
      expect(requests).toHaveLength(ONCE);
      expect(mentionsRun).toBe(true);
      expect(senders).toStrictEqual(["main-red"]);
    }),
  ));

test("30 分以内の続く失敗では、同じリポジトリの依頼を重ねない", () =>
  run(
    Effect.gen(function* quiet() {
      const { env, sent } = yield* withQueue;
      yield* wake({ env, claims: CLAIMS });
      yield* TestClock.adjust(TEN_MINUTES);
      const response = yield* wake({ env, claims: { ...CLAIMS, run_id: "12" } });
      const answer: unknown = yield* Effect.promise(() => response.json());
      const requests = yield* Ref.get(sent);
      expect(answer).toStrictEqual({ woken: false });
      expect(requests).toHaveLength(ONCE);
    }),
  ));

test("1 時間たてば、続く失敗をもう一度積む", () =>
  run(
    Effect.gen(function* later() {
      const { env, sent } = yield* withQueue;
      yield* wake({ env, claims: CLAIMS });
      yield* TestClock.adjust(AN_HOUR);
      yield* wake({ env, claims: { ...CLAIMS, run_id: "12" } });
      const requests = yield* Ref.get(sent);
      expect(requests).toHaveLength(TWICE);
    }),
  ));

import type { ClaudeRequest } from "@masseater.dev/exposure-protocol/claude-requests";
import { Array as Arr, Duration, Effect, Ref, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";
import { expect, test } from "vite-plus/test";

import type { Claims } from "#/entities/credential/index.ts";
import { memoryStore } from "#/shared/lib/app-store.test.support.ts";

import { notify, remember } from "./exposure-ledger.ts";
import type { ExposureEnv } from "./exposure-ledger.ts";

const CLAIMS: typeof Claims.Type = {
  repository_owner: "masseater",
  repository_owner_id: "62135405",
  repository: "masseater/masseater.dev",
  repository_id: "1411948414",
  event_name: "schedule",
  ref: "refs/heads/main",
  run_id: "7",
  run_attempt: "1",
  workflow_ref: "masseater/masseater.dev/.github/workflows/exposure.yml@refs/heads/main",
  environment: "exposure",
};

const FOUND = {
  fingerprint: "open-host:kikite.masseater.dev",
  line: "認証なしの GET が 200 を返した",
};

const ALMOST_A_DAY = Duration.fromInputUnsafe("23 hours");
const AN_HOUR = Duration.fromInputUnsafe("1 hour");
const ONCE = 1;
const TWICE = 2;

type Queue = Readonly<{ env: ExposureEnv; sent: Ref.Ref<readonly ClaudeRequest[]> }>;

const withQueue: Effect.Effect<Queue> = Effect.gen(function* withQueue() {
  const sent = yield* Ref.make<readonly ClaudeRequest[]>([]);
  const context = yield* Effect.context();
  const { env: store } = memoryStore();
  const record = (request: ClaudeRequest): Effect.Effect<void> =>
    Ref.update(sent, Arr.append(request));
  const send = (request: ClaudeRequest): Promise<void> =>
    Effect.runPromiseWith(context)(record(request));
  const env: ExposureEnv = { ...store, CLAUDE_REQUESTS: { send } };
  return { env, sent };
});

const clock = TestClock.layer();

const run = <Value>(effect: Effect.Effect<Value>): Promise<Value> =>
  Effect.runPromise(Effect.provide(effect, clock));

const report = (
  env: ExposureEnv,
  found: readonly Readonly<typeof FOUND>[],
): Effect.Effect<Response> => notify({ env, claims: CLAIMS, report: { findings: found } });

const fromThisRun = (request: ClaudeRequest): boolean =>
  request.sender === "exposure-check" && Str.includes("/actions/runs/7")(request.text);

test("見たことのある守りは、今回見えなくても台帳に残す", () =>
  run(
    Effect.gen(function* ratchet() {
      const { env } = yield* withQueue;
      yield* remember({ env, observed: [{ kind: "host", key: "kikite.masseater.dev" }] });
      const response = yield* remember({ env, observed: [{ kind: "repository", key: "42" }] });
      const ledger: unknown = yield* Effect.promise(() => response.json());
      expect(ledger).toStrictEqual({
        entries: [
          { kind: "host", key: "kikite.masseater.dev" },
          { kind: "repository", key: "42" },
        ],
      });
    }),
  ));

test("同じ見つけたものは 24 時間に 1 回だけ Claude に知らせる", () =>
  run(
    Effect.gen(function* dedupe() {
      const { env, sent } = yield* withQueue;
      yield* report(env, [FOUND]);
      yield* TestClock.adjust(ALMOST_A_DAY);
      yield* report(env, [FOUND]);
      const early = yield* Ref.get(sent);
      yield* TestClock.adjust(AN_HOUR);
      yield* report(env, [FOUND]);
      const requests = yield* Ref.get(sent);
      expect([early.length, requests.length]).toStrictEqual([ONCE, TWICE]);
      expect(pipe(requests, Arr.every(fromThisRun))).toBe(true);
    }),
  ));

test("一度直って再び見つかったものは、24 時間を待たずに知らせる", () =>
  run(
    Effect.gen(function* reappear() {
      const { env, sent } = yield* withQueue;
      yield* report(env, [FOUND]);
      yield* report(env, []);
      yield* report(env, [FOUND]);
      const requests = yield* Ref.get(sent);
      expect(requests.length).toBe(TWICE);
    }),
  ));

test("何も見つからなければ知らせない", () =>
  run(
    Effect.gen(function* quiet() {
      const { env, sent } = yield* withQueue;
      yield* report(env, []);
      const requests = yield* Ref.get(sent);
      expect(requests).toStrictEqual([]);
    }),
  ));

import { DateTime, Duration, Effect, Option } from "effect";
import { expect, test } from "vite-plus/test";

import { STARTUP } from "#config";

import {
  OUTCOMES,
  audio,
  audioRejecting,
  sceneAt,
  sceneWithBrokenContainer,
  storageWith,
} from "./alarm.test.support.ts";
import type { Scene } from "./alarm.test.support.ts";
import { alarmed } from "./perform.ts";
import type { AudioBucket } from "./perform.ts";
import { arm, lastRun } from "./player-state.ts";

type Seen = Readonly<{ plays: number; lastRun: unknown }>;

const NOT_YET = Number.MAX_SAFE_INTEGER;
const LONG_AGO = 1;
const ONCE = 1;
const TWICE = 2;
const NEVER = 0;
const MARGIN = { minutes: 1 } as const;

const ring = (scene: Scene, bucket: AudioBucket, times: number): Promise<Seen> =>
  Effect.runPromise(
    Effect.gen(function* alarms() {
      yield* Effect.repeat(alarmed(scene.stage, bucket), { times: times - ONCE });
      const last = yield* lastRun(scene.stage.storage);
      return { plays: scene.plays(), lastRun: Option.getOrUndefined(last) };
    }),
  );

const armedLead = (): Promise<number> =>
  Effect.runPromise(
    Effect.gen(function* armInAnHour() {
      const { storage, alarmAt } = storageWith({});
      const now = yield* DateTime.now;
      const startAt = DateTime.toEpochMillis(DateTime.add(now, { hours: 1 }));
      yield* arm(storage, startAt);
      const wakeAt = yield* Effect.fromOption(alarmAt());
      return startAt - wakeAt;
    }),
  );

test("流す時刻より前に起動できたら done を残す", () =>
  expect(ring(sceneAt(NOT_YET), audio, ONCE)).resolves.toMatchObject({
    plays: ONCE,
    lastRun: { status: "done", outcomes: OUTCOMES },
  }));

test("同じ startAt の alarm がやり直されても、プレイヤーは一度しか動かさない", () =>
  expect(ring(sceneAt(NOT_YET), audio, TWICE)).resolves.toMatchObject({
    plays: ONCE,
    lastRun: { status: "failed", reason: "alarm retried after an interrupted run" },
  }));

test("音源の取得が拒否されても alarm は投げず、failed を残す", () =>
  expect(ring(sceneAt(NOT_YET), audioRejecting("r2 is down"), ONCE)).resolves.toMatchObject({
    plays: NEVER,
    lastRun: { status: "failed", reason: "Error: r2 is down" },
  }));

test("想定していない例外でも alarm は投げず、failed を残す", () =>
  expect(ring(sceneWithBrokenContainer(NOT_YET), audio, ONCE)).resolves.toMatchObject({
    plays: NEVER,
    lastRun: { status: "failed", reason: "Error: the container is gone" },
  }));

test("コンテナの起動が流す時刻を過ぎたら、遅れを late として残す", () =>
  expect(ring(sceneAt(LONG_AGO), audio, ONCE)).resolves.toMatchObject({
    plays: ONCE,
    lastRun: { status: "late", outcomes: OUTCOMES },
  }));

test("起動の猶予を使い切っても、流す時刻まで余裕が残る", () => {
  const budget = Duration.times(Duration.fromInputUnsafe(STARTUP.spacing), STARTUP.probes);
  const required = Duration.sum(budget, Duration.fromInputUnsafe(MARGIN));
  return expect(armedLead()).resolves.toBeGreaterThanOrEqual(Duration.toMillis(required));
});

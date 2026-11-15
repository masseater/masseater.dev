import { Array as Arr, Effect, Option, Ref, String as Str } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { expect, test } from "vite-plus/test";

import { memoryStore, randomKey } from "#/shared/api/app-store.test.support.ts";

import { fireRoutine, registerRoutine } from "./claude-routine.ts";

const ROW = "claude_routine";
const TRIGGER = "trig_01TestRoutine";
const TOKEN = `sk-ant-oat01-${randomKey()}`;
const FIRE_URL = `https://api.anthropic.com/v1/claude_code/routines/${TRIGGER}/fire`;
const OK = 200;
const FORBIDDEN = 403;

type Sent = Readonly<{ url: string; authorization: string; version: string }>;

const sentOf = (request: HttpClientRequest.HttpClientRequest): Sent => ({
  url: request.url,
  authorization: request.headers["authorization"] ?? "",
  version: request.headers["anthropic-version"] ?? "",
});

const responding =
  (sent: Ref.Ref<Sent[]>, status: number) =>
  (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.Effect<HttpClientResponse.HttpClientResponse> => {
    const response = HttpClientResponse.fromWeb(request, new Response("{}", { status }));
    return Ref.update(sent, Arr.append(sentOf(request))).pipe(Effect.as(response));
  };

const recording = (
  status: number,
): Effect.Effect<Readonly<{ client: HttpClient.HttpClient; sent: Ref.Ref<Sent[]> }>> =>
  Ref.make<Sent[]>([]).pipe(
    Effect.map((sent) => ({ sent, client: HttpClient.make(responding(sent, status)) })),
  );

test("登録したルーティンを封をして置き、押すと API に Bearer で送る", () =>
  Effect.runPromise(
    Effect.gen(function* registerAndFire() {
      const { env, rows } = memoryStore();
      const registered = yield* registerRoutine({
        env,
        routine: { triggerId: TRIGGER, token: TOKEN },
      });
      const { client, sent } = yield* recording(OK);
      const outcome = yield* fireRoutine(env).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
      );
      expect(registered).toBe(true);
      expect(Option.exists(rows.get(ROW), (stored) => !Str.includes(TOKEN)(stored))).toBe(true);
      expect(outcome).toBe("fired");
      const requests = yield* Ref.get(sent);
      expect(requests).toStrictEqual([
        { url: FIRE_URL, authorization: `Bearer ${TOKEN}`, version: "2023-06-01" },
      ]);
    }),
  ));

test("形の違うトークンは登録しない", () =>
  Effect.runPromise(
    Effect.gen(function* rejectMalformed() {
      const { env, rows } = memoryStore();
      const registered = yield* registerRoutine({
        env,
        routine: { triggerId: TRIGGER, token: "not-a-token" },
      });
      expect(registered).toBe(false);
      expect(Option.isNone(rows.get(ROW))).toBe(true);
    }),
  ));

test("未登録なら送らずに missing を返す", () =>
  Effect.runPromise(
    Effect.gen(function* missing() {
      const { env } = memoryStore();
      const { client, sent } = yield* recording(OK);
      const outcome = yield* fireRoutine(env).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
      );
      const requests = yield* Ref.get(sent);
      expect(outcome).toBe("missing");
      expect(requests).toStrictEqual([]);
    }),
  ));

test("API が拒んだら rejected を返す", () =>
  Effect.runPromise(
    Effect.gen(function* rejected() {
      const { env } = memoryStore();
      yield* registerRoutine({ env, routine: { triggerId: TRIGGER, token: TOKEN } });
      const { client } = yield* recording(FORBIDDEN);
      const outcome = yield* fireRoutine(env).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
      );
      expect(outcome).toBe("rejected");
    }),
  ));

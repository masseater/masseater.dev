import { Array as Arr, Effect, Option, Predicate, Ref, String as Str, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { expect, test } from "vite-plus/test";

import { memoryStore, randomKey } from "#/shared/lib/app-store.test.support.ts";

import { fireRoutine, registerRoutine } from "./claude-routine.ts";

const ROW = "claude_routine";
const TRIGGER = "trig_01TestRoutine";
const TOKEN = `sk-ant-oat01-${randomKey()}`;
const FIRE_URL = `https://api.anthropic.com/v1/claude_code/routines/${TRIGGER}/fire`;
const OK = 200;
const FORBIDDEN = 403;

type Sent = Readonly<{
  url: string;
  authorization: string;
  version: string;
  carriesText: boolean;
}>;

const REQUEST_TEXT = "記事を直して";

const decoder = new TextDecoder();

const carriesText = (request: HttpClientRequest.HttpClientRequest): boolean =>
  pipe(
    request.body,
    Option.liftPredicate(Predicate.hasProperty("body")),
    Option.map(({ body }) => body),
    Option.filter(Predicate.isUint8Array),
    Option.exists((bytes) => Str.includes(REQUEST_TEXT)(decoder.decode(bytes))),
  );

const sentOf = (request: HttpClientRequest.HttpClientRequest): Sent => ({
  url: request.url,
  authorization: request.headers["authorization"] ?? "",
  version: request.headers["anthropic-version"] ?? "",
  carriesText: carriesText(request),
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

test("登録したルーティンを封をして置き、押すと API に Bearer で本文なしの起動を送る", () =>
  Effect.runPromise(
    Effect.gen(function* registerAndFire() {
      const { env, rows } = memoryStore();
      const registered = yield* registerRoutine({
        env,
        routine: { triggerId: TRIGGER, token: TOKEN },
      });
      const { client, sent } = yield* recording(OK);
      const outcome = yield* fireRoutine(env, Option.none()).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
      );
      expect(registered).toBe(true);
      expect(Option.exists(rows.get(ROW), (stored) => !Str.includes(TOKEN)(stored))).toBe(true);
      expect(outcome).toBe("fired");
      const requests = yield* Ref.get(sent);
      expect(requests).toStrictEqual([
        {
          url: FIRE_URL,
          authorization: `Bearer ${TOKEN}`,
          version: "2023-06-01",
          carriesText: false,
        },
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
      const outcome = yield* fireRoutine(env, Option.none()).pipe(
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
      const outcome = yield* fireRoutine(env, Option.none()).pipe(
        Effect.provideService(HttpClient.HttpClient, client),
      );
      expect(outcome).toBe("rejected");
    }),
  ));

const OTHER_TRIGGER = "trig_01OtherProject";

const PROJECT = "aredoko";

const registerBoth = (env: ReturnType<typeof memoryStore>["env"]): Effect.Effect<void> =>
  Effect.andThen(
    registerRoutine({ env, routine: { triggerId: TRIGGER, token: TOKEN } }),
    registerRoutine({ env, routine: { triggerId: OTHER_TRIGGER, token: TOKEN, project: PROJECT } }),
  ).pipe(Effect.asVoid);

const urls = (requests: readonly Sent[]): readonly string[] =>
  pipe(
    requests,
    Arr.map(({ url }) => url),
  );

test("プロジェクト名を付けた登録は別に置き、その名前で押したときだけ使う", () =>
  Effect.runPromise(
    Effect.gen(function* perProject() {
      const { env, rows } = memoryStore();
      yield* registerBoth(env);
      const { client, sent } = yield* recording(OK);
      const outcomes = yield* Effect.forEach(
        [Option.some(PROJECT), Option.some("nowhere"), Option.some("../x")],
        (project) => fireRoutine(env, project),
        { concurrency: 1 },
      ).pipe(Effect.provideService(HttpClient.HttpClient, client));
      const requests = yield* Ref.get(sent);
      expect(Option.isSome(rows.get(`${ROW}:${PROJECT}`))).toBe(true);
      expect(outcomes).toStrictEqual(["fired", "missing", "missing"]);
      expect(urls(requests)).toStrictEqual([
        `https://api.anthropic.com/v1/claude_code/routines/${OTHER_TRIGGER}/fire`,
      ]);
    }),
  ));

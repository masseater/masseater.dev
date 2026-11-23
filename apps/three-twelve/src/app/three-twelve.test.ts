import { Effect } from "effect";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { BASE_PATH } from "#/shared/config/index.ts";

import {
  KNOWN_TOKEN,
  flood,
  limitedKeys,
  recordedCalls,
  resetCalls,
} from "./three-twelve.test.support.ts";
import worker from "./three-twelve.ts";

vi.mock("cloudflare:workers", () => import("./three-twelve.test.support.ts"));

beforeEach(resetCalls);

const ORIGIN = "https://masseater.dev";

const OK = 200;

const UNAUTHORIZED = 401;

const NOT_FOUND = 404;

const TOO_MANY = 429;

const IP = "192.0.2.1";

const call = (
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
): Effect.Effect<Response> =>
  Effect.promise(() =>
    worker.fetch(new Request(`${ORIGIN}${BASE_PATH}${path}`, { method, headers })),
  );

const jsonOf = (response: Response): Effect.Effect<unknown> =>
  Effect.promise(() => response.json());

test("知らない bot のトークンは 401 で断り、状態を読まない", () =>
  Effect.runPromise(
    Effect.gen(function* unknownToken() {
      const response = yield* call("GET", "/status", { authorization: "Bot unknown.token" });
      const body = yield* jsonOf(response);
      expect(response.status).toBe(UNAUTHORIZED);
      expect(body).toStrictEqual({ error: "unknown bot token" });
      expect(recordedCalls()).toStrictEqual(["isToken"]);
    }),
  ));

test("トークンの無いリクエストは 401 で断り、曲を置かない", () =>
  Effect.runPromise(
    Effect.gen(function* withoutToken() {
      const response = yield* call("PUT", "/audio", {});
      expect(response.status).toBe(UNAUTHORIZED);
      expect(recordedCalls()).toStrictEqual(["isToken"]);
    }),
  ));

test("登録した bot のトークンなら状態を返す", () =>
  Effect.runPromise(
    Effect.gen(function* knownToken() {
      const response = yield* call("GET", "/status", { authorization: `Bot ${KNOWN_TOKEN}` });
      const body = yield* jsonOf(response);
      expect(response.status).toBe(OK);
      expect(body).toStrictEqual({ lastRun: { status: "played" } });
      expect(recordedCalls()).toStrictEqual(["isToken", "lastRun"]);
    }),
  ));

test("無い経路はトークンを確かめる前に 404 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* unknownRoute() {
      const response = yield* call("DELETE", "/audio", { authorization: `Bot ${KNOWN_TOKEN}` });
      expect(response.status).toBe(NOT_FOUND);
      expect(recordedCalls()).toStrictEqual([]);
    }),
  ));

test("上限を超えた送信元は、トークンを確かめる前に 429 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* flooded() {
      flood();
      const status = yield* call("GET", "/status", { authorization: `Bot ${KNOWN_TOKEN}` });
      const token = yield* call("PUT", "/token", { authorization: "Bot unknown.token" });
      expect(status.status).toBe(TOO_MANY);
      expect(token.status).toBe(TOO_MANY);
      expect(recordedCalls()).toStrictEqual([]);
    }),
  ));

test("上限は送信元の IP ごとに数える", () =>
  Effect.runPromise(
    Effect.gen(function* countsByIp() {
      yield* call("GET", "/status", { "cf-connecting-ip": IP });
      expect(limitedKeys()).toStrictEqual([IP]);
    }),
  ));

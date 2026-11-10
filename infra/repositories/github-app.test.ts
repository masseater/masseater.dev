import { Effect, Option, Schema, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { memoryStore, randomKey } from "./app-store.test.support.ts";
import type { MemoryStore } from "./app-store.test.support.ts";
import { writeSealed } from "./app-store.ts";
import { readApp } from "./github-app.ts";

const APP_ROW = "app";
const SEALED_PREFIX = "v1.";
const FAKE_PEM = "obviously-fake-pem";
const APP = { id: 1, slug: "masseater-manager", pem: FAKE_PEM };

type Env = MemoryStore["env"];

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

const APP_JSON = Option.getOrElse(encodeJson(APP), () => "");

const isSealed = (stored: Option.Option<string>): boolean =>
  Option.exists(
    stored,
    (value) => Str.startsWith(SEALED_PREFIX)(value) && !Str.includes(FAKE_PEM)(value),
  );

const failureOf = (env: Env): Effect.Effect<string> =>
  readApp(env).pipe(
    Effect.match({ onFailure: ({ message }) => message, onSuccess: () => "read without failing" }),
  );

test("App がまだ無ければ何も返さない", () =>
  Effect.runPromise(
    Effect.gen(function* absent() {
      const { env } = memoryStore();
      const app = yield* readApp(env);
      expect(app).toStrictEqual(Option.none());
    }),
  ));

test("変更前に平文で置かれた App はそのまま読め、読んだときに封筒へ書き換わる", () =>
  Effect.runPromise(
    Effect.gen(function* legacy() {
      const { env, rows } = memoryStore({ [APP_ROW]: APP_JSON });
      const first = yield* readApp(env);
      const migrated = rows.get(APP_ROW);
      const second = yield* readApp(env);
      expect(first).toStrictEqual(Option.some(APP));
      expect(isSealed(migrated)).toBe(true);
      expect(second).toStrictEqual(Option.some(APP));
    }),
  ));

test("封筒で置かれた App は復号して読める", () =>
  Effect.runPromise(
    Effect.gen(function* sealed() {
      const { env } = memoryStore();
      yield* writeSealed({ env, name: APP_ROW, plaintext: APP_JSON });
      const app = yield* readApp(env);
      expect(app).toStrictEqual(Option.some(APP));
    }),
  ));

test("復号できない封筒は GitHubAppFailed になり、暗号文を App として扱わない", () =>
  Effect.runPromise(
    Effect.gen(function* undecryptable() {
      const { env } = memoryStore();
      yield* writeSealed({ env, name: APP_ROW, plaintext: APP_JSON });
      const failure = yield* failureOf({ ...env, SEAL_KEY: randomKey() });
      expect(failure).toContain("could not be opened");
    }),
  ));

test("中身が App の形でないときの失敗は、保管していた値を含まない", () =>
  Effect.runPromise(
    Effect.gen(function* malformed() {
      const { env } = memoryStore({ [APP_ROW]: `${FAKE_PEM}-that-is-not-json` });
      const failure = yield* failureOf(env);
      expect(failure).toBe("the stored GitHub App is malformed");
    }),
  ));

import { Array as Arr, Effect, Option, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { memoryStore, randomKey } from "./app-store.test.support.ts";
import type { MemoryStore } from "./app-store.test.support.ts";
import { writeSealed } from "./app-store.ts";
import { atprotoRoute, issueAppPassword } from "./atproto.ts";

const PASSWORD_ROW = "atp_app_password";
const ATTEMPTS_ROW = "atp_attempts";
const SEALED_PREFIX = "v1.";
const PASSWORD = `fake-${randomKey()}`;
const ISSUED = Option.some({ atpAppPassword: PASSWORD });
const BROKER_URL = "https://credentials.masseater.dev/";
const SUBMIT_URL = `${BROKER_URL}atproto/app-password`;
const LIMIT = 5;
const OVER_LIMIT = 7;
const UNHANDLED = 0;
const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

type Env = MemoryStore["env"];

const isSealed = (stored: Option.Option<string>): boolean =>
  Option.exists(
    stored,
    (value) => Str.startsWith(SEALED_PREFIX)(value) && !Str.includes(PASSWORD)(value),
  );

const statusOf = (request: Request, env: Env): Effect.Effect<number> =>
  Option.match(atprotoRoute({ request, env }), {
    onNone: () => Effect.succeed(UNHANDLED),
    onSome: Effect.map((response) => response.status),
  });

const submitMalformed = (env: Env): Effect.Effect<number> =>
  statusOf(new Request(SUBMIT_URL, { method: "POST", body: "{}" }), env);

test("変更前に平文で置かれたパスワードはそのまま渡し、読んだときに封筒へ書き換える", () =>
  Effect.runPromise(
    Effect.gen(function* legacy() {
      const { env, rows } = memoryStore({ [PASSWORD_ROW]: PASSWORD });
      const first = yield* issueAppPassword({ env, granted: true });
      const migrated = rows.get(PASSWORD_ROW);
      const second = yield* issueAppPassword({ env, granted: true });
      expect(first).toStrictEqual(ISSUED);
      expect(isSealed(migrated)).toBe(true);
      expect(second).toStrictEqual(ISSUED);
    }),
  ));

test("封筒で置かれたパスワードは復号して渡す", () =>
  Effect.runPromise(
    Effect.gen(function* sealed() {
      const { env } = memoryStore();
      yield* writeSealed({ env, name: PASSWORD_ROW, plaintext: PASSWORD });
      const issued = yield* issueAppPassword({ env, granted: true });
      expect(issued).toStrictEqual(ISSUED);
    }),
  ));

test("復号できない封筒は、パスワードが無いときと同じに扱い、暗号文を渡さない", () =>
  Effect.runPromise(
    Effect.gen(function* undecryptable() {
      const { env } = memoryStore();
      yield* writeSealed({ env, name: PASSWORD_ROW, plaintext: PASSWORD });
      const other = { ...env, SEAL_KEY: randomKey() };
      const issued = yield* issueAppPassword({ env: other, granted: true });
      expect(issued).toStrictEqual(Option.none());
    }),
  ));

test("権限が無ければ、行を読まずに何も渡さない", () =>
  Effect.runPromise(
    Effect.gen(function* notGranted() {
      const { env, rows } = memoryStore({ [PASSWORD_ROW]: PASSWORD });
      const issued = yield* issueAppPassword({ env, granted: false });
      expect(issued).toStrictEqual(Option.none());
      expect(rows.get(PASSWORD_ROW)).toStrictEqual(Option.some(PASSWORD));
    }),
  ));

test("パスワードの受け口は 5 回まで試させ、6 回目からはサインインに進まず 429 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* limited() {
      const { env, rows } = memoryStore();
      const statuses = yield* Effect.forEach(
        Arr.makeBy(OVER_LIMIT, () => env),
        submitMalformed,
      );
      expect(Arr.take(statuses, LIMIT)).toStrictEqual(Arr.makeBy(LIMIT, () => UNAUTHORIZED));
      expect(Arr.drop(statuses, LIMIT)).toStrictEqual([TOO_MANY_REQUESTS, TOO_MANY_REQUESTS]);
      expect(Option.isSome(rows.get(ATTEMPTS_ROW))).toBe(true);
      expect(rows.get(PASSWORD_ROW)).toStrictEqual(Option.none());
    }),
  ));

test("受け口以外のリクエストは扱わず、試行にも数えない", () =>
  Effect.runPromise(
    Effect.gen(function* otherRoutes() {
      const { env, rows } = memoryStore();
      const viaGet = yield* statusOf(new Request(SUBMIT_URL), env);
      const toRoot = yield* statusOf(new Request(BROKER_URL, { method: "POST" }), env);
      expect([viaGet, toRoot]).toStrictEqual([UNHANDLED, UNHANDLED]);
      expect(rows.get(ATTEMPTS_ROW)).toStrictEqual(Option.none());
    }),
  ));

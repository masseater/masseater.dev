import { Array as Arr, Effect, Option, Schema, String as Str } from "effect";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import { writeSealed } from "#/shared/api/index.ts";
import { memoryStore, randomKey } from "#/shared/lib/app-store.test.support.ts";
import type { MemoryStore } from "#/shared/lib/app-store.test.support.ts";

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

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

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

const submit = (env: Env, body: string): Effect.Effect<number> =>
  statusOf(new Request(SUBMIT_URL, { method: "POST", body }), env);

const submitWrong = (env: Env): Effect.Effect<number> =>
  submit(
    env,
    Option.getOrElse(encodeJson({ password: `wrong-${PASSWORD}` }), () => ""),
  );

const OWNER_DID = "did:plc:sz2kxumpsjbch3kgnsjjed5z";
const FAKE_JWT = "eyJhbGciOiJub25lIn0.e30.";
const NO_CONTENT = 204;

const Credentials = Schema.Struct({ password: Schema.String });

const session = (submitted: unknown): Response => {
  if (Schema.is(Credentials)(submitted) && submitted.password === PASSWORD) {
    return Response.json({
      did: OWNER_DID,
      handle: "owner.test",
      accessJwt: FAKE_JWT,
      refreshJwt: FAKE_JWT,
    });
  }
  return Response.json(
    { error: "AuthenticationRequired", message: "Invalid identifier or password" },
    { status: UNAUTHORIZED },
  );
};

const network = setupServer(
  http.post("https://bsky.social/xrpc/com.atproto.server.createSession", ({ request }) =>
    Effect.runPromise(Effect.promise(() => request.json()).pipe(Effect.map(session))),
  ),
);

beforeAll(() => {
  network.listen({ onUnhandledFrame: "error" });
});

afterAll(() => {
  network.close();
});

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
        submitWrong,
        { concurrency: 1 },
      );
      expect(Arr.take(statuses, LIMIT)).toStrictEqual(Arr.makeBy(LIMIT, () => UNAUTHORIZED));
      expect(Arr.drop(statuses, LIMIT)).toStrictEqual([TOO_MANY_REQUESTS, TOO_MANY_REQUESTS]);
      expect(Option.isSome(rows.get(ATTEMPTS_ROW))).toBe(true);
      expect(rows.get(PASSWORD_ROW)).toStrictEqual(Option.none());
    }),
  ));

test("パスワードの形をしていない送信は断り、試行には数えない", () =>
  Effect.runPromise(
    Effect.gen(function* malformed() {
      const { env, rows } = memoryStore();
      const statuses = yield* Effect.forEach(
        Arr.makeBy(OVER_LIMIT, () => ["{}", "", '{"password":""}', "not json"]).flat(),
        (body) => submit(env, body),
        { concurrency: 1 },
      );
      const afterwards = yield* submitWrong(env);
      expect(Arr.dedupe(statuses)).toStrictEqual([UNAUTHORIZED]);
      expect(afterwards).toBe(UNAUTHORIZED);
      expect(rows.get(PASSWORD_ROW)).toStrictEqual(Option.none());
    }),
  ));

test("持ち主としてサインインできたパスワードは 204 で受け取り、封筒に入れて置く", () =>
  Effect.runPromise(
    Effect.gen(function* accepted() {
      const { env, rows } = memoryStore();
      const body = Option.getOrElse(encodeJson({ password: PASSWORD }), () => "");
      const status = yield* submit(env, body);
      const issued = yield* issueAppPassword({ env, granted: true });
      expect(status).toBe(NO_CONTENT);
      expect(isSealed(rows.get(PASSWORD_ROW))).toBe(true);
      expect(issued).toStrictEqual(ISSUED);
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

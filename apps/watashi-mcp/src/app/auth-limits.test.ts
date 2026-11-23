import { afterAll, beforeEach, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { vi } from "vite-plus/test";

import { createAuth } from "#/shared/auth/index.server.ts";

import { closeDatabase, resetDatabase } from "./auth-limits.test.support.ts";

vi.mock("cloudflare:workers", () => import("./auth-limits.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

const AUTH = "https://watashi.masseater.dev/api/auth";

const CREATED = 201;
const OK = 200;
const FORBIDDEN = 403;
const TOO_MANY = 429;
const REGISTRATIONS_PER_MINUTE = 5;
const PASSKEY_REQUESTS_PER_MINUTE = 10;
const FIRST = 1;
const REGISTRATION =
  '{"client_name":"Claude","redirect_uris":["https://claude.ai/api/mcp/auth_callback"],"token_endpoint_auth_method":"none"}';

type Caller = Readonly<{ ip: string; forwardedFor: string }>;

const headersOf = ({ ip, forwardedFor }: Caller): Record<string, string> => ({
  "cf-connecting-ip": ip,
  "x-forwarded-for": forwardedFor,
  "content-type": "application/json",
});

const statusOf = (request: Request): Effect.Effect<number> =>
  Effect.promise(() => createAuth().handler(request)).pipe(
    Effect.map((response) => response.status),
  );

const register = (caller: Caller): Effect.Effect<number> =>
  statusOf(
    new Request(`${AUTH}/oauth2/register`, {
      method: "POST",
      headers: headersOf(caller),
      body: REGISTRATION,
    }),
  );

const passkeyOptions =
  (path: string) =>
  (caller: Caller): Effect.Effect<number> =>
    statusOf(new Request(`${AUTH}/passkey/${path}`, { headers: headersOf(caller) }));

const repeated = (
  times: number,
  call: (index: number) => Effect.Effect<number>,
): Effect.Effect<readonly number[]> =>
  Effect.forEach(Arr.range(FIRST, times), call, { concurrency: 1 });

const spoofing =
  (ip: string) =>
  (index: number): Caller => ({
    ip,
    forwardedFor: `198.51.100.${String(index)}`,
  });

const fromManyIps = (index: number): Caller => ({
  ip: `203.0.113.${String(index)}`,
  forwardedFor: "198.51.100.1",
});

it.effect(
  "同じ接続元からのクライアント登録は 1 分に 5 回までで、X-Forwarded-For を変えても数え直さない",
  () =>
    Effect.gen(function* limitsRegistration() {
      const statuses = yield* repeated(REGISTRATIONS_PER_MINUTE + FIRST, (index) =>
        register(spoofing("192.0.2.10")(index)),
      );
      expect(statuses).toStrictEqual([
        ...Arr.replicate(CREATED, REGISTRATIONS_PER_MINUTE),
        TOO_MANY,
      ]);
    }),
);

it.effect("接続元が違えば、X-Forwarded-For が同じでもクライアント登録を別々に数える", () =>
  Effect.gen(function* countsPerIp() {
    const statuses = yield* repeated(REGISTRATIONS_PER_MINUTE + FIRST, (index) =>
      register(fromManyIps(index)),
    );
    expect(pipe(statuses, Arr.dedupe)).toStrictEqual([CREATED]);
  }),
);

it.effect.each([
  ["generate-register-options", FORBIDDEN],
  ["generate-authenticate-options", OK],
] as const)("同じ接続元からの passkey/%s は 1 分に 10 回までにする", ([path, served]) =>
  Effect.gen(function* limitsPasskeyOptions() {
    const statuses = yield* repeated(PASSKEY_REQUESTS_PER_MINUTE + FIRST, (index) =>
      passkeyOptions(path)(spoofing(`192.0.2.${String(served)}`)(index)),
    );
    expect(statuses).toStrictEqual([
      ...Arr.replicate(served, PASSKEY_REQUESTS_PER_MINUTE),
      TOO_MANY,
    ]);
  }),
);

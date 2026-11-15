import { Effect, Option, Schema } from "effect";
import { expect, test } from "vite-plus/test";

import { memoryStore } from "./app-store.test.support.ts";
import type { MemoryStore } from "./app-store.test.support.ts";
import { tailnetRoute } from "./tailnet.ts";

const BROKER = "https://credentials.masseater.dev";
const NOT_FOUND = 404;
const OK = 200;

const requestOf = (path: string, method = "GET"): Request =>
  new Request(`${BROKER}${path}`, { method });

const fetched = (env: MemoryStore["env"], path: string): Effect.Effect<Response> =>
  Option.getOrElse(tailnetRoute({ request: requestOf(path), env }), () =>
    Effect.succeed(new Response("", { status: NOT_FOUND })),
  );

const textOf = (response: Response): Effect.Effect<string> => Effect.promise(() => response.text());

const decodeJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const jsonOf = (response: Response): Effect.Effect<unknown, Schema.SchemaError> =>
  textOf(response).pipe(Effect.flatMap(decodeJson));

test("SSH の CA の公開鍵は一度作ったものを返し続ける", () =>
  Effect.runPromise(
    Effect.gen(function* stableCa() {
      const { env, rows } = memoryStore();
      const first = yield* fetched(env, "/tailnet/ssh-ca.pub");
      const line = yield* textOf(first);
      const again = yield* fetched(env, "/tailnet/ssh-ca.pub").pipe(Effect.flatMap(textOf));
      expect(first.status).toBe(OK);
      expect(line).toMatch(/^ssh-ed25519 \S+ sundries\n$/u);
      expect(again).toBe(line);
      expect(Option.isSome(rows.get("tailnet_ssh_ca"))).toBe(true);
    }),
  ));

test("OIDC の設定は broker を issuer とし、RS256 の公開鍵を kid 付きで出す", () =>
  Effect.runPromise(
    Effect.gen(function* discovery() {
      const { env } = memoryStore();
      const config = yield* fetched(env, "/.well-known/openid-configuration").pipe(
        Effect.flatMap(jsonOf),
      );
      const keys = yield* fetched(env, "/.well-known/jwks.json").pipe(Effect.flatMap(jsonOf));
      expect(config).toMatchObject({
        issuer: BROKER,
        jwks_uri: `${BROKER}/.well-known/jwks.json`,
      });
      expect(keys).toMatchObject({ keys: [{ kty: "RSA", alg: "RS256", use: "sig" }] });
      expect(keys).toHaveProperty("keys.0.kid");
    }),
  ));

test("POST や知らない道は受けない", () => {
  const { env } = memoryStore();
  const post = tailnetRoute({ request: requestOf("/tailnet/ssh-ca.pub", "POST"), env });
  const unknown = tailnetRoute({ request: requestOf("/tailnet/other"), env });
  expect(Option.isNone(post)).toBe(true);
  expect(Option.isNone(unknown)).toBe(true);
});

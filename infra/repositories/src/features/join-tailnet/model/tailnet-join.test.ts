import { Effect } from "effect";
import { jwtVerify } from "jose";
import { expect, test } from "vite-plus/test";

import { fails, memoryStore } from "#/shared/lib/app-store.test.support.ts";

import { OIDC_SIGNER, signingKey } from "./signing-keys.ts";
import { joinTailnet } from "./tailnet-join.ts";
import type { TailnetEnv } from "./tailnet-join.ts";

const BROKER = "https://credentials.masseater.dev";
const AUDIENCE = "api.tailscale.com/k-test";
const CLIENT_ID = "k-test";
const NOT_A_KEY = { key: "ssh-ed25519" };
const USER_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl agent";

const tailnetEnv = (): TailnetEnv => ({
  ...memoryStore().env,
  TAILNET_CLIENT_ID: CLIENT_ID,
  TAILNET_AUDIENCE: AUDIENCE,
});

const verified = (env: TailnetEnv, token: string): Effect.Effect<string | undefined> =>
  signingKey(OIDC_SIGNER)(env).pipe(
    Effect.flatMap((signer) =>
      Effect.promise(() =>
        jwtVerify(token, signer.publicKey, { issuer: BROKER, audience: AUDIENCE }),
      ),
    ),
    Effect.orDie,
    Effect.map(({ payload }) => payload.sub),
  );

test("broker の鍵で署名した、Tailscale 向けの id token と SSH の証明書を返す", () =>
  Effect.runPromise(
    Effect.gen(function* joined() {
      const env = tailnetEnv();
      const result = yield* joinTailnet(USER_KEY)(env);
      const subject = yield* verified(env, result.idToken);
      expect(subject).toBe("sundries");
      expect(result.clientId).toBe(`${CLIENT_ID}?ephemeral=true&preauthorized=true`);
      expect(result.tags).toStrictEqual(["tag:agent"]);
      expect(result.sshUser).toBe("u1");
      expect(result.sshCertificate).toMatch(/^ssh-ed25519-cert-v01@openssh\.com \S+ sundries$/u);
    }),
  ));

test("公開鍵が文字列でなければ断る", () =>
  Effect.runPromise(
    Effect.gen(function* refused() {
      const refusal = yield* fails(joinTailnet(NOT_A_KEY)(tailnetEnv()));
      expect(refusal).toBe(true);
    }),
  ));

test("tailnet のスタックが当たっていなければ断る", () =>
  Effect.runPromise(
    Effect.gen(function* unconfigured() {
      const refusal = yield* fails(joinTailnet(USER_KEY)(memoryStore().env));
      expect(refusal).toBe(true);
    }),
  ));

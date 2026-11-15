import { OWNER_ID } from "@masseater.dev/repositories/github-oidc";
import { Array as Arr, Effect, MutableRef, Option, Schema } from "effect";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import type { CryptoKey, JWK } from "jose";
import { beforeAll, expect, test, vi } from "vite-plus/test";

import worker from "./ci-telemetry.worker.ts";

type Signer = Readonly<{ privateKey: CryptoKey; jwk: JWK }>;

const { CI_TELEMETRY_AUDIENCE } = vi.hoisted(() => ({
  CI_TELEMETRY_AUDIENCE: "masseater-dev-test-ci-telemetry",
}));

vi.mock("#app-name", () => ({ CI_TELEMETRY_AUDIENCE }));

const ISSUER = "https://token.actions.githubusercontent.com";

const JWKS_URL = `${ISSUER}/.well-known/jwks`;

const KEY_ID = "github-actions";

const ALGORITHM = "RS256";

const ACCEPTED = 202;

const UNAUTHORIZED = 401;

const CLAIMS = {
  repository: "masseater/masseater.dev",
  repository_owner_id: OWNER_ID,
  workflow: "verify",
  run_id: "1",
  run_attempt: "1",
  ref: "refs/heads/main",
  sha: "0000000000000000000000000000000000000000",
  event_name: "push",
};

const PAYLOAD = {
  jobs: [
    {
      id: 1,
      name: "verify",
      conclusion: "success",
      started_at: "2026-11-10T00:00:00Z",
      completed_at: "2026-11-10T00:01:00Z",
      runner_name: "GitHub Actions 1",
      steps: [
        {
          number: 1,
          name: "checkout",
          conclusion: "success",
          started_at: "2026-11-10T00:00:00Z",
          completed_at: "2026-11-10T00:00:10Z",
        },
      ],
    },
  ],
};

const trusted = MutableRef.make(Option.none<Signer>());

const jwksRequests = MutableRef.make<readonly string[]>([]);

const newSigner = Effect.promise(() => generateKeyPair(ALGORITHM)).pipe(
  Effect.flatMap(({ privateKey, publicKey }) =>
    Effect.promise(() => exportJWK(publicKey)).pipe(Effect.map((jwk) => ({ privateKey, jwk }))),
  ),
);

const trustedSigner = Effect.sync(() => MutableRef.get(trusted)).pipe(
  Effect.flatMap(Effect.fromOption),
  Effect.orDie,
);

const githubJwks = (url: string): Response => {
  MutableRef.update(jwksRequests, Arr.append(url));
  return Option.match(MutableRef.get(trusted), {
    onNone: () => new Response("", { status: 503 }),
    onSome: ({ jwk }) => Response.json({ keys: [{ ...jwk, kid: KEY_ID, alg: ALGORITHM }] }),
  });
};

vi.stubGlobal("fetch", (input: string) => Promise.resolve(githubJwks(input)));

beforeAll(() =>
  Effect.runPromise(
    newSigner.pipe(Effect.map((signer) => MutableRef.set(trusted, Option.some(signer)))),
  ),
);

const tokenFrom = (
  signer: Effect.Effect<Signer>,
  claims: Readonly<Record<string, string>>,
  audience: string,
): Effect.Effect<string> =>
  signer.pipe(
    Effect.flatMap(({ privateKey }) =>
      Effect.promise(() =>
        new SignJWT(claims)
          .setProtectedHeader({ alg: ALGORITHM, kid: KEY_ID })
          .setIssuer(ISSUER)
          .setAudience(audience)
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(privateKey),
      ),
    ),
  );

const encodePayload = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const send = (authorization: Option.Option<string>): Effect.Effect<Response> =>
  encodePayload(PAYLOAD).pipe(
    Effect.orDie,
    Effect.flatMap((body) =>
      Effect.promise(() =>
        worker.fetch(
          new Request("https://masseater.dev/ci-telemetry", {
            method: "POST",
            headers: Option.match(authorization, {
              onNone: () => ({}),
              onSome: (value) => ({ authorization: value }),
            }),
            body,
          }),
        ),
      ),
    ),
  );

const sendToken = (token: string): Effect.Effect<number> =>
  send(Option.some(`Bearer ${token}`)).pipe(Effect.map(({ status }) => status));

test("トークンの無いリクエストは 401 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* withoutToken() {
      const response = yield* send(Option.none());
      expect(response.status).toBe(UNAUTHORIZED);
    }),
  ));

test("JWT でないトークンは 401 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* malformedToken() {
      const status = yield* sendToken("not-a-jwt");
      expect(status).toBe(UNAUTHORIZED);
    }),
  ));

test("GitHub の鍵でない鍵で署名したトークンは 401 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* forgedToken() {
      const token = yield* tokenFrom(newSigner, CLAIMS, CI_TELEMETRY_AUDIENCE);
      const status = yield* sendToken(token);
      expect(status).toBe(UNAUTHORIZED);
      expect(MutableRef.get(jwksRequests)).toContain(JWKS_URL);
    }),
  ));

test("ほかの宛先に出したトークンは 401 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* foreignAudience() {
      const token = yield* tokenFrom(trustedSigner, CLAIMS, "https://example.com");
      const status = yield* sendToken(token);
      expect(status).toBe(UNAUTHORIZED);
    }),
  ));

test("ほかの持ち主のリポジトリのトークンは 401 で断る", () =>
  Effect.runPromise(
    Effect.gen(function* foreignOwner() {
      const token = yield* tokenFrom(
        trustedSigner,
        { ...CLAIMS, repository: "someone/else", repository_owner_id: "1" },
        CI_TELEMETRY_AUDIENCE,
      );
      const status = yield* sendToken(token);
      expect(status).toBe(UNAUTHORIZED);
    }),
  ));

test("持ち主のリポジトリのトークンなら時間を受け付ける", () =>
  Effect.runPromise(
    Effect.gen(function* ownerToken() {
      const token = yield* tokenFrom(trustedSigner, CLAIMS, CI_TELEMETRY_AUDIENCE);
      const status = yield* sendToken(token);
      expect(status).toBe(ACCEPTED);
    }),
  ));

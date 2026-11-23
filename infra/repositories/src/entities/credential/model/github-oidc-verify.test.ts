import { Array as Arr, Effect, Result } from "effect";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import { CREDENTIAL_BROKER_AUDIENCE } from "#/shared/config/index.ts";

import { verify } from "./github-oidc.ts";

const ISSUER = "https://token.actions.githubusercontent.com";
const BROKER_URL = "https://credentials.masseater.dev/";
const PINNED = "RS256";
const UNPINNED = "PS256";

const CLAIMS = {
  repository_owner: "masseater",
  repository_owner_id: "62135405",
  repository: "masseater/masseater.dev",
  repository_id: "1411948414",
  event_name: "push",
  ref: "refs/heads/main",
  run_id: "1",
  run_attempt: "1",
  workflow_ref: "masseater/masseater.dev/.github/workflows/verify.yml@refs/heads/main",
};

type Signer = Readonly<{
  jwk: Readonly<Record<string, unknown>>;
  sign: (claims: Readonly<Record<string, string>>) => Promise<string>;
}>;

const signerOf = (algorithm: string): Effect.Effect<Signer> =>
  Effect.promise(() => generateKeyPair(algorithm)).pipe(
    Effect.flatMap(({ privateKey, publicKey }) =>
      Effect.promise(() => exportJWK(publicKey)).pipe(
        Effect.map((jwk) => ({
          jwk: { ...jwk, kid: algorithm },
          sign: (claims: Readonly<Record<string, string>>) =>
            new SignJWT(claims)
              .setProtectedHeader({ alg: algorithm, kid: algorithm })
              .setIssuer(ISSUER)
              .setAudience(CREDENTIAL_BROKER_AUDIENCE)
              .setIssuedAt()
              .setExpirationTime("5m")
              .sign(privateKey),
        })),
      ),
    ),
  );

const signers = Effect.runPromise(
  Effect.all({ pinned: signerOf(PINNED), unpinned: signerOf(UNPINNED) }, { concurrency: 1 }),
);

const network = setupServer(
  http.get(`${ISSUER}/.well-known/jwks`, () =>
    Effect.runPromise(
      Effect.promise(() => signers).pipe(
        Effect.map(({ pinned, unpinned }) => Response.json({ keys: [pinned.jwk, unpinned.jwk] })),
      ),
    ),
  ),
);

beforeAll(() => {
  network.listen({ onUnhandledFrame: "error" });
});

afterAll(() => {
  network.close();
});

const accepts = (token: string): Effect.Effect<boolean> =>
  verify(new Request(BROKER_URL, { headers: { authorization: `Bearer ${token}` } })).pipe(
    Effect.result,
    Effect.map(Result.isSuccess),
  );

const acceptsEvent = (event: string): Effect.Effect<boolean> =>
  Effect.promise(() => signers).pipe(
    Effect.flatMap(({ pinned }) =>
      Effect.promise(() => pinned.sign({ ...CLAIMS, event_name: event })),
    ),
    Effect.flatMap(accepts),
  );

const TRUSTED = ["push", "schedule", "workflow_dispatch", "repository_dispatch"];

const UNTRUSTED = [
  "pull_request_target",
  "workflow_run",
  "issue_comment",
  "issues",
  "watch",
  "deployment_status",
];

test("a job on main started by a push, a schedule or a dispatch is accepted", () =>
  Effect.runPromise(
    Effect.gen(function* trusted() {
      const accepted = yield* Effect.forEach(TRUSTED, acceptsEvent, { concurrency: 1 });
      expect(accepted).toStrictEqual(Arr.makeBy(TRUSTED.length, () => true));
    }),
  ));

test("a job on main started by any other event is rejected, including events outsiders can raise", () =>
  Effect.runPromise(
    Effect.gen(function* untrusted() {
      const accepted = yield* Effect.forEach(UNTRUSTED, acceptsEvent, { concurrency: 1 });
      expect(accepted).toStrictEqual(Arr.makeBy(UNTRUSTED.length, () => false));
    }),
  ));

test("a token signed with an algorithm other than RS256 is rejected even when its key is published", () =>
  Effect.runPromise(
    Effect.gen(function* algorithm() {
      const { unpinned } = yield* Effect.promise(() => signers);
      const token = yield* Effect.promise(() => unpinned.sign(CLAIMS));
      const accepted = yield* accepts(token);
      expect(accepted).toBe(false);
    }),
  ));

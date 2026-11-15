import { Effect, Option, pipe } from "effect";
import { calculateJwkThumbprint } from "jose";
import type { JWK } from "jose";

import type { AppStoreEnv } from "./app-store.ts";
import type { RouteInput } from "./github-app.ts";
import type { SealFailed } from "./sealed-value.ts";
import { OIDC_SIGNER, SSH_CA, signingKey } from "./signing-keys.ts";
import { authorizedKey } from "./ssh-certificate.ts";
import type { SigningPair, SshCertificateFailed } from "./ssh-certificate.ts";
import { AGENT_SUBJECT, TAILNET_ISSUER } from "./tailnet-names.ts";

const JWT_ALGORITHM = "RS256";
const DISCOVERY_PATH = "/.well-known/openid-configuration";
const JWKS_PATH = "/.well-known/jwks.json";
const SSH_CA_PATH = "/tailnet/ssh-ca.pub";
const CACHE_CONTROL = "public, max-age=300";

const oidcSigner = signingKey(OIDC_SIGNER);

const sshCaKey = signingKey(SSH_CA);

const publicJwk = (pair: SigningPair): Effect.Effect<JWK> =>
  Effect.gen(function* exportPublic() {
    const exported = yield* Effect.promise(() => crypto.subtle.exportKey("jwk", pair.publicKey));
    const jwk: JWK = { ...exported };
    const kid = yield* Effect.promise(() => calculateJwkThumbprint(jwk));
    return { ...jwk, kid, alg: JWT_ALGORITHM, use: "sig" };
  });

const discovery = {
  issuer: TAILNET_ISSUER,
  jwks_uri: `${TAILNET_ISSUER}${JWKS_PATH}`,
  response_types_supported: ["id_token"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: [JWT_ALGORITHM],
};

const json = (body: unknown): Response =>
  Response.json(body, { headers: { "cache-control": CACHE_CONTROL } });

const jwks = (env: AppStoreEnv): Effect.Effect<Response, SealFailed> =>
  oidcSigner(env).pipe(
    Effect.flatMap(publicJwk),
    Effect.map((key) => json({ keys: [key] })),
  );

const sshCa = (env: AppStoreEnv): Effect.Effect<Response, SealFailed | SshCertificateFailed> =>
  sshCaKey(env).pipe(
    Effect.flatMap(authorizedKey),
    Effect.map(
      (line) =>
        new Response(`${line} ${AGENT_SUBJECT}\n`, {
          headers: { "content-type": "text/plain", "cache-control": CACHE_CONTROL },
        }),
    ),
  );

const failedAs =
  (event: string) =>
  <Failure>(effect: Effect.Effect<Response, Failure>): Effect.Effect<Response> =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Effect.logError(event, cause).pipe(Effect.as(new Response("", { status: 502 }))),
      ),
    );

const tailnetRoute = ({ request, env }: RouteInput): Option.Option<Effect.Effect<Response>> => {
  if (request.method !== "GET") {
    return Option.none();
  }
  const { pathname } = new URL(request.url);
  if (pathname === DISCOVERY_PATH) {
    return Option.some(Effect.succeed(json(discovery)));
  }
  if (pathname === JWKS_PATH) {
    return Option.some(pipe(jwks(env), failedAs("tailnet.jwks_failed")));
  }
  if (pathname === SSH_CA_PATH) {
    return Option.some(pipe(sshCa(env), failedAs("tailnet.ssh_ca_failed")));
  }
  return Option.none();
};

export { tailnetRoute };

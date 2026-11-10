import { expect, it } from "@effect/vitest";
import { Effect, Option, Result } from "effect";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import type { JWTVerifyGetKey } from "jose";

import { verifyAccess } from "./access";

type Claims = Readonly<{ issuer: string; audience: string; expiresIn: string }>;

type Signer = Readonly<{ sign: (claims: Claims) => Promise<string>; keys: JWTVerifyGetKey }>;

const ACCESS_HEADER = "cf-access-jwt-assertion";
const TEAM = "team.cloudflareaccess.com";
const AUDIENCE = "aud-personal-mcp";
const KEY_ID = "key-1";
const ALGORITHM = "RS256";

const VALID: Claims = { issuer: `https://${TEAM}`, audience: AUDIENCE, expiresIn: "5m" };

const signer = Effect.promise(() => generateKeyPair(ALGORITHM)).pipe(
  Effect.flatMap(({ privateKey, publicKey }) =>
    Effect.promise(() => exportJWK(publicKey)).pipe(
      Effect.map((jwk): Signer => ({
        keys: createLocalJWKSet({ keys: [{ ...jwk, kid: KEY_ID, alg: ALGORITHM }] }),
        sign: ({ issuer, audience, expiresIn }) =>
          new SignJWT({ email: "owner@example.com" })
            .setProtectedHeader({ alg: ALGORITHM, kid: KEY_ID })
            .setIssuer(issuer)
            .setAudience(audience)
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(privateKey),
      })),
    ),
  ),
);

const requestWith = (token: Option.Option<string>): Request =>
  new Request("https://personal-mcp.masseater.dev/mcp", {
    method: "POST",
    headers: Option.match(token, {
      onNone: () => ({}),
      onSome: (value) => ({ [ACCESS_HEADER]: value }),
    }),
  });

const accepts = Effect.fn("accepts")(function* accepts(
  keys: JWTVerifyGetKey,
  token: Option.Option<string>,
) {
  const verified = yield* verifyAccess(requestWith(token), {
    keys,
    teamDomain: TEAM,
    audience: AUDIENCE,
  }).pipe(Effect.result);
  return Result.isSuccess(verified);
});

const acceptsSigned = Effect.fn("acceptsSigned")(function* acceptsSigned(claims: Claims) {
  const { sign, keys } = yield* signer;
  const token = yield* Effect.promise(() => sign(claims));
  return yield* accepts(keys, Option.some(token));
});

it.effect("このアプリの aud とチームの issuer で署名された JWT を通す", () =>
  Effect.gen(function* valid() {
    const accepted = yield* acceptsSigned(VALID);
    expect(accepted).toBe(true);
  }),
);

it.effect("JWT の無いリクエストを拒む", () =>
  Effect.gen(function* missing() {
    const { keys } = yield* signer;
    const accepted = yield* accepts(keys, Option.none());
    expect(accepted).toBe(false);
  }),
);

it.effect("ほかの Access アプリの aud、ほかのチームの issuer、期限切れを拒む", () =>
  Effect.gen(function* mismatched() {
    const otherAudience = yield* acceptsSigned({ ...VALID, audience: "aud-other" });
    const otherIssuer = yield* acceptsSigned({
      ...VALID,
      issuer: "https://other.cloudflareaccess.com",
    });
    const expired = yield* acceptsSigned({ ...VALID, expiresIn: "-1m" });
    expect([otherAudience, otherIssuer, expired]).toStrictEqual([false, false, false]);
  }),
);

it.effect("別の鍵で署名された JWT を拒む", () =>
  Effect.gen(function* foreignKey() {
    const { keys } = yield* signer;
    const other = yield* signer;
    const token = yield* Effect.promise(() => other.sign(VALID));
    const accepted = yield* accepts(keys, Option.some(token));
    expect(accepted).toBe(false);
  }),
);

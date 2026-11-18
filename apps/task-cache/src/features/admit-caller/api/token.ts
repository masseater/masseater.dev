import { Context } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://token.actions.githubusercontent.com";

export interface Presented {
  readonly token: string;
  readonly audience: string;
}

export type VerifyToken = (presented: Presented) => Promise<Readonly<{ payload: unknown }>>;

export const TokenVerifier = Context.Reference<VerifyToken>("task-cache/TokenVerifier", {
  defaultValue: () => {
    const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
    const verify: VerifyToken = (presented) =>
      jwtVerify(presented.token, jwks, { issuer: ISSUER, audience: presented.audience });
    return verify;
  },
});

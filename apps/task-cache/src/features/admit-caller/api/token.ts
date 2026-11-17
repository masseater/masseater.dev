import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://token.actions.githubusercontent.com";

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

export interface Presented {
  readonly token: string;
  readonly audience: string;
}

export const verifiedToken = (presented: Presented): Promise<Readonly<{ payload: unknown }>> =>
  jwtVerify(presented.token, jwks, { issuer: ISSUER, audience: presented.audience });

import { Effect, Option, Schema } from "effect";
import { jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";

type AccessVerifier = Readonly<{ keys: JWTVerifyGetKey; teamDomain: string; audience: string }>;

const ACCESS_HEADER = "cf-access-jwt-assertion";

const ALGORITHMS = ["RS256"];

const taggedError = Schema.TaggedError;

class AccessDenied extends taggedError<AccessDenied, { readonly brand: unique symbol }>()(
  "AccessDenied",
  { reason: Schema.String },
) {}

const issuerOf = (teamDomain: string): string => `https://${teamDomain}`;

const certsUrl = (teamDomain: string): URL =>
  new URL(`${issuerOf(teamDomain)}/cdn-cgi/access/certs`);

const verifyAccess = Effect.fn("verifyAccess")(function* verifyAccess(
  request: Request,
  { keys, teamDomain, audience }: AccessVerifier,
) {
  const token = yield* Effect.fromOption(
    Option.fromNullishOr(request.headers.get(ACCESS_HEADER)),
  ).pipe(Effect.mapError(() => AccessDenied.make({ reason: "access token missing" })));
  const { payload } = yield* Effect.tryPromise({
    try: () =>
      jwtVerify(token, keys, { issuer: issuerOf(teamDomain), audience, algorithms: ALGORITHMS }),
    catch: (cause) => AccessDenied.make({ reason: String(cause) }),
  });
  return payload;
});

export { certsUrl, verifyAccess };
export type { AccessVerifier };

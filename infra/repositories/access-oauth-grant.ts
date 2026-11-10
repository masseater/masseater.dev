import { Clock, Effect, Option, Schema, pipe } from "effect";
import type { TokenEndpointResponse } from "oauth4webapi";

import { failed, failedWith } from "./access-oauth-failed.ts";
import type { AccessOAuthFailed } from "./access-oauth-failed.ts";
import type { AccessSite } from "./access-sites.ts";
import { readRow, swapSealed, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import { unseal } from "./sealed-value.ts";

const MILLISECONDS = 1000;
const NO_LIFETIME = 0;

const Grant = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  expiresAt: Schema.Finite,
});

const GrantJson = Schema.fromJsonString(Grant);

type AccessGrant = typeof Grant.Type;

type StoredGrant = Readonly<{ stored: string; grant: AccessGrant }>;

type GrantSwap = Readonly<{
  env: AppStoreEnv;
  site: AccessSite;
  expected: Option.Option<string>;
  grant: AccessGrant;
}>;

const grantKey = (site: AccessSite): string => `access_oauth_grant:${site}`;

type IssuedTokens = Readonly<{
  tokens: Readonly<Pick<TokenEndpointResponse, "access_token" | "refresh_token" | "expires_in">>;
  previous: Option.Option<string>;
}>;

const grantFrom = ({
  tokens,
  previous,
}: IssuedTokens): Effect.Effect<AccessGrant, AccessOAuthFailed> =>
  Effect.gen(function* toGrant() {
    const refreshToken = yield* pipe(
      Option.fromNullishOr(tokens.refresh_token),
      Option.orElse(() => previous),
      Effect.fromOption,
      Effect.mapError(() => failedWith("the authorization server returned no refresh token")),
    );
    const now = yield* Clock.currentTimeMillis;
    const lifetime = tokens.expires_in ?? NO_LIFETIME;
    return {
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt: now + lifetime * MILLISECONDS,
    };
  });

const readGrant = ({
  env,
  site,
}: Readonly<{ env: AppStoreEnv; site: AccessSite }>): Effect.Effect<
  Option.Option<StoredGrant>,
  AccessOAuthFailed
> =>
  readRow({ env, name: grantKey(site) }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (stored) =>
          unseal({ key: env.SEAL_KEY, name: grantKey(site), stored }).pipe(
            Effect.flatMap(({ plaintext }) => Schema.decodeEffect(GrantJson)(plaintext)),
            Effect.mapBoth({
              onFailure: failed,
              onSuccess: (grant) => Option.some({ stored, grant }),
            }),
          ),
      }),
    ),
  );

const saveGrant = ({
  env,
  site,
  expected,
  grant,
}: GrantSwap): Effect.Effect<boolean, AccessOAuthFailed> =>
  Schema.encodeEffect(GrantJson)(grant).pipe(
    Effect.flatMap((plaintext) =>
      Option.match(expected, {
        onNone: () => writeSealed({ env, name: grantKey(site), plaintext }).pipe(Effect.as(true)),
        onSome: () => swapSealed({ env, name: grantKey(site), expected, plaintext }),
      }),
    ),
    Effect.mapError(failed),
  );

export { grantFrom, readGrant, saveGrant };
export type { AccessGrant, StoredGrant };

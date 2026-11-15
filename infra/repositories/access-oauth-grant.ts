import { Clock, Effect, Option, Schema, pipe } from "effect";
import type { TokenEndpointResponse } from "oauth4webapi";

import { failed, failedWith } from "./access-oauth-failed.ts";
import type { AccessOAuthFailed } from "./access-oauth-failed.ts";
import { readRow, swapSealed, writeSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import type { OAuthTargetId } from "./oauth-targets.ts";
import { unseal } from "./sealed-value.ts";

const MILLISECONDS = 1000;
const NO_LIFETIME = 0;

const Grant = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  expiresAt: Schema.Finite,
});

const GrantJson = Schema.fromJsonString(Grant);

export type AccessGrant = typeof Grant.Type;

export type StoredGrant = Readonly<{ stored: string; grant: AccessGrant }>;

export type GrantSwap = Readonly<{
  env: AppStoreEnv;
  site: OAuthTargetId;
  expected: Option.Option<string>;
  grant: AccessGrant;
}>;

export const grantKey = (site: OAuthTargetId): string => `access_oauth_grant:${site}`;

export type IssuedTokens = Readonly<{
  tokens: Readonly<Pick<TokenEndpointResponse, "access_token" | "refresh_token" | "expires_in">>;
  previous: Option.Option<string>;
}>;

export const grantFrom = ({
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

export const readGrant = ({
  env,
  site,
}: Readonly<{ env: AppStoreEnv; site: OAuthTargetId }>): Effect.Effect<
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

export const saveGrant = ({
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

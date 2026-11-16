import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Clock, DateTime, Effect, Logger, Option, Schema } from "effect";
import {
  None as noClientAuthentication,
  processRefreshTokenResponse,
  refreshTokenGrantRequest,
  ResponseBodyError,
} from "oauth4webapi";

import type { OAuthTargetId } from "#/entities/oauth-target/index.ts";
import { Site } from "#/features/access-oauth/api/access-oauth-login.ts";
import {
  connect,
  loginUrlOf,
  resourceOf,
} from "#/features/access-oauth/api/access-oauth-server.ts";
import type { SiteContext } from "#/features/access-oauth/api/access-oauth-server.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

import { AccessOAuthFailed, failed, failedWith } from "./access-oauth-failed.ts";
import { grantFrom, readGrant, saveGrant } from "./access-oauth-grant.ts";
import type { AccessGrant } from "./access-oauth-grant.ts";

const REFRESH_MARGIN_MS = 60_000;

export type SiteToken =
  | Readonly<{ status: "ok"; site: OAuthTargetId; accessToken: string; expiresAt: string }>
  | Readonly<{ status: "login"; site: OAuthTargetId; loginUrl: string }>
  | Readonly<{ status: "failed"; site: OAuthTargetId; message: string }>;

export interface AccessOAuthRpc extends Rpc.WorkerEntrypointBranded {
  token: (site: OAuthTargetId) => Promise<SiteToken>;
}

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const loginNeeded = (site: OAuthTargetId): SiteToken => ({
  status: "login",
  site,
  loginUrl: loginUrlOf(site),
});

const issued = (site: OAuthTargetId, grant: AccessGrant): SiteToken => ({
  status: "ok",
  site,
  accessToken: grant.accessToken,
  expiresAt: DateTime.formatIso(DateTime.makeUnsafe(grant.expiresAt)),
});

const refreshFailed = (error: unknown): AccessOAuthFailed => {
  if (error instanceof ResponseBodyError && error.error === "invalid_grant") {
    return AccessOAuthFailed.make({ message: error.message, grantExpired: true });
  }
  return failed(error);
};

const refresh = ({
  env,
  site,
  grant,
}: SiteContext & Readonly<{ grant: AccessGrant }>): Effect.Effect<AccessGrant, AccessOAuthFailed> =>
  connect({ env, site }).pipe(
    Effect.flatMap(({ server, client }) =>
      Effect.tryPromise({
        try: () =>
          refreshTokenGrantRequest(server, client, noClientAuthentication(), grant.refreshToken, {
            additionalParameters: { resource: resourceOf(site) },
          }),
        catch: refreshFailed,
      }).pipe(
        Effect.flatMap((response) =>
          Effect.tryPromise({
            try: () => processRefreshTokenResponse(server, client, response),
            catch: refreshFailed,
          }),
        ),
      ),
    ),
    Effect.flatMap((tokens) => grantFrom({ tokens, previous: Option.some(grant.refreshToken) })),
  );

const rotate = ({
  env,
  site,
  stored,
  grant,
}: SiteContext & Readonly<{ stored: string; grant: AccessGrant }>): Effect.Effect<
  SiteToken,
  AccessOAuthFailed
> =>
  refresh({ env, site, grant }).pipe(
    Effect.flatMap((next) =>
      saveGrant({ env, site, expected: Option.some(stored), grant: next }).pipe(
        Effect.flatMap((saved) => {
          if (saved) {
            return Effect.succeed(issued(site, next));
          }
          return readGrant({ env, site }).pipe(
            Effect.map(
              Option.match({
                onNone: () => loginNeeded(site),
                onSome: (winner) => issued(site, winner.grant),
              }),
            ),
          );
        }),
      ),
    ),
    Effect.catchIf(
      (failure) => failure.grantExpired,
      () => Effect.logWarning("access_oauth.grant_expired").pipe(Effect.as(loginNeeded(site))),
    ),
  );

const tokenFor = ({ env, site }: SiteContext): Effect.Effect<SiteToken, AccessOAuthFailed> =>
  Effect.gen(function* token() {
    const current = yield* readGrant({ env, site });
    if (Option.isNone(current)) {
      return loginNeeded(site);
    }
    const now = yield* Clock.currentTimeMillis;
    const { stored, grant } = current.value;
    if (grant.expiresAt - now > REFRESH_MARGIN_MS) {
      return issued(site, grant);
    }
    return yield* rotate({ env, site, stored, grant });
  });

export class AccessOAuth extends WorkerEntrypoint<AppStoreEnv> implements AccessOAuthRpc {
  public token(site: OAuthTargetId): Promise<SiteToken> {
    const { env } = this;
    return runner(logger)(
      Schema.decodeEffect(Site)(site).pipe(
        Effect.mapError(() => failedWith("site is not one of the OAuth targets")),
        Effect.flatMap((target) => tokenFor({ env, site: target })),
        Effect.catchTag("AccessOAuthFailed", ({ message }) =>
          Effect.logError("access_oauth.token_failed").pipe(
            Effect.annotateLogs({ reason: message }),
            Effect.as<SiteToken>({ status: "failed", site, message }),
          ),
        ),
      ),
    );
  }
}

export { accessOAuthRoute } from "#/features/access-oauth/api/access-oauth-login.ts";

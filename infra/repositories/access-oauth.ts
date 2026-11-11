import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Clock, DateTime, Effect, Logger, Option, Schema } from "effect";
import {
  None as noClientAuthentication,
  processRefreshTokenResponse,
  refreshTokenGrantRequest,
  ResponseBodyError,
} from "oauth4webapi";

import { AccessOAuthFailed, failed, failedWith } from "./access-oauth-failed.ts";
import { grantFrom, readGrant, saveGrant } from "./access-oauth-grant.ts";
import type { AccessGrant } from "./access-oauth-grant.ts";
import { Site } from "./access-oauth-login.ts";
import { connect, loginUrlOf, resourceOf } from "./access-oauth-server.ts";
import type { SiteContext } from "./access-oauth-server.ts";
import type { AccessSite } from "./access-sites.ts";
import type { AppStoreEnv } from "./app-store.ts";

const REFRESH_MARGIN_MS = 60_000;
const BAD_GATEWAY = 502;

type SiteToken =
  | Readonly<{ status: "ok"; site: AccessSite; accessToken: string; expiresAt: string }>
  | Readonly<{ status: "login"; site: AccessSite; loginUrl: string }>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const loginNeeded = (site: AccessSite): SiteToken => ({
  status: "login",
  site,
  loginUrl: loginUrlOf(site),
});

const issued = (site: AccessSite, grant: AccessGrant): SiteToken => ({
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

const siteParameter = (request: Request): string | null =>
  new URL(request.url).searchParams.get("site");

class AccessOAuth extends WorkerEntrypoint<AppStoreEnv> {
  public override fetch(request: Request): Promise<Response> {
    const { env } = this;
    return runner(logger)(
      Schema.decodeUnknownEffect(Site)(siteParameter(request)).pipe(
        Effect.mapError(() => failedWith("site is not one of the Access sites")),
        Effect.flatMap((site) => tokenFor({ env, site })),
        Effect.map((token) => Response.json(token)),
        Effect.catchTag("AccessOAuthFailed", ({ message }) =>
          Effect.logError("access_oauth.token_failed").pipe(
            Effect.annotateLogs({ reason: message }),
            Effect.as(new Response("", { status: BAD_GATEWAY })),
          ),
        ),
      ),
    );
  }
}

export { AccessOAuth };
export { accessOAuthRoute } from "./access-oauth-login.ts";

import type { SiteToken } from "@masseater.dev/repositories/credential-broker.worker";
import type { OAuthTargetId } from "@masseater.dev/repositories/oauth-targets";
import { constVoid } from "effect/Function";

export const TOKENS: Readonly<Record<string, SiteToken>> = {
  "twilog/r_masseater": {
    status: "ok",
    site: "twilog/r_masseater",
    accessToken: "token-r_masseater",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  "twilog/u1_mas": {
    status: "login",
    site: "twilog/u1_mas",
    loginUrl: "https://credentials.masseater.dev/access-oauth/login?site=twilog%2Fu1_mas",
  },
};

export const tokens = { current: TOKENS };

export const env = {
  TOOL_CALLS: { writeDataPoint: constVoid },
  ACCESS_OAUTH: {
    token: (site: OAuthTargetId): Promise<SiteToken> =>
      Promise.resolve(
        tokens.current[site] ?? { status: "failed", site, message: "unknown target" },
      ),
  },
};

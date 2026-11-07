import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import type { Auth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { env } from "cloudflare:workers";

import { CONSENT_PATH, MCP_URL, SIGN_IN_PATH, SITE_ORIGIN } from "#/shared/config";
import { db } from "#/shared/db/index.server";

import {
  account,
  authRelations,
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  passkey,
  session,
  user,
  verification,
} from "./generated/auth.table";
import { ownerPasskey } from "./passkey.server";

interface AuthOptions {
  baseURL: string;
  database: ReturnType<typeof drizzleAdapter>;
  disabledPaths: string[];
  plugins: [ReturnType<typeof jwt>, typeof ownerPasskey, ReturnType<typeof mcp>];
  secret: string;
}

const createAuth = (): Auth<AuthOptions> =>
  betterAuth<AuthOptions>({
    baseURL: SITE_ORIGIN,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        account,
        authRelations,
        jwks,
        oauthAccessToken,
        oauthClient,
        oauthClientAssertion,
        oauthClientResource,
        oauthConsent,
        oauthRefreshToken,
        oauthResource,
        passkey,
        session,
        user,
        verification,
      },
    }),
    disabledPaths: ["/token"],
    plugins: [
      jwt(),
      ownerPasskey,
      mcp({
        loginPage: SIGN_IN_PATH,
        consentPage: CONSENT_PATH,
        resource: MCP_URL,
        scopes: ["openid", "profile", "offline_access"],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationDefaultApplicationType: "infer",
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
  });

export { createAuth };
export type { AuthOptions };

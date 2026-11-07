import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { DB } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import type { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import type { Auth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { ownerPasskey } from "./passkey.server";
import type { OwnerPasskeyConfig } from "./passkey.server";

interface OwnerAuthOptions {
  baseURL: string;
  database: ReturnType<typeof drizzleAdapter>;
  disabledPaths: string[];
  plugins: [
    ReturnType<typeof jwt>,
    ReturnType<typeof passkey>,
    ReturnType<typeof mcp>,
    ReturnType<typeof tanstackStartCookies>,
  ];
  secret: string;
}

interface OwnerAuthConfig {
  readonly origin: string;
  readonly db: DB;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly secret: string;
  readonly owner: Omit<OwnerPasskeyConfig, "origin">;
  readonly loginPage: string;
  readonly consentPage: string;
  readonly resource: string;
}

const createOwnerAuth = ({
  origin,
  db,
  schema,
  secret,
  owner,
  loginPage,
  consentPage,
  resource,
}: OwnerAuthConfig): Auth<OwnerAuthOptions> =>
  betterAuth<OwnerAuthOptions>({
    baseURL: origin,
    database: drizzleAdapter(db, { provider: "sqlite", schema: { ...schema } }),
    disabledPaths: ["/token"],
    plugins: [
      jwt(),
      ownerPasskey({ ...owner, origin }),
      mcp({
        loginPage,
        consentPage,
        resource,
        scopes: ["openid", "profile", "offline_access"],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationDefaultApplicationType: "infer",
      }),
      tanstackStartCookies(),
    ],
    secret,
  });

export { createOwnerAuth };
export type { OwnerAuthConfig, OwnerAuthOptions };

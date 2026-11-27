import { createOwnerAuth } from "@masseater.dev/owner-auth/server";
import type { OwnerAuthOptions } from "@masseater.dev/owner-auth/server";
import type { Auth } from "better-auth";

import { jwks, oauthClientAssertion, verification } from "#/shared/auth/generated/auth.table.ts";
import { MCP_URL, SITE_NAME, SITE_ORIGIN } from "#/shared/config/index.ts";
import { authDbOf } from "#/shared/db/index.server.ts";

const ADMIN_INVITE_HASH =
  "09ede8fe35ffb5c8af0177f6b7ca4157:761aa2057403f491eae984cb0f6ae9bc7d9d69f38c37f38cc1d57f4f2b9fd8a908ff3daa42b227b95b5f4fe20c1e0d9cb6740d08f7c524e8b04ea17b4558d1cd";

export type AuthBindings = Readonly<{ DB: D1Database; BETTER_AUTH_SECRET: string }>;

export const createAuth = (bindings: AuthBindings): Auth<OwnerAuthOptions> =>
  createOwnerAuth({
    origin: SITE_ORIGIN,
    db: authDbOf(bindings.DB),
    schema: { jwks, oauthClientAssertion, verification },
    secret: bindings.BETTER_AUTH_SECRET,
    owner: { inviteHash: ADMIN_INVITE_HASH, ownerName: "管理者", rpName: SITE_NAME },
    loginPage: "/admin/sign-in",
    consentPage: "/mcp/consent",
    resource: MCP_URL,
  });

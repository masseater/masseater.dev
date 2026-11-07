import { createOwnerAuth } from "@masseater.dev/owner-auth/server";
import type { OwnerAuthOptions } from "@masseater.dev/owner-auth/server";
import type { Auth } from "better-auth";
import { env } from "cloudflare:workers";

import { jwks, oauthClientAssertion, verification } from "#/shared/auth/generated/auth.table";
import { MCP_URL, SITE_NAME, SITE_ORIGIN } from "#/shared/config";
import { db } from "#/shared/db/index.server";

const ADMIN_INVITE_HASH =
  "0783be06da583619492f48ab0b63cf28:321e2a524c933faa5d97530e7ff2498507de79ce6ed3e708dd5ccf686b176076c86eedd68415c65a4a060de0a2d3db814e60922aed2261e693706e31a32e1dc4";

const createAuth = (): Auth<OwnerAuthOptions> =>
  createOwnerAuth({
    origin: SITE_ORIGIN,
    db,
    schema: { jwks, oauthClientAssertion, verification },
    secret: env.BETTER_AUTH_SECRET,
    owner: { inviteHash: ADMIN_INVITE_HASH, ownerName: "管理者", rpName: SITE_NAME },
    loginPage: "/admin/sign-in",
    consentPage: "/mcp/consent",
    resource: MCP_URL,
  });

export { createAuth };

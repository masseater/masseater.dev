import { createOwnerAuth } from "@masseater.dev/owner-auth/server";
import type { OwnerAuthOptions } from "@masseater.dev/owner-auth/server";
import type { Auth } from "better-auth";

import { jwks, oauthClientAssertion, verification } from "#/shared/auth/generated/auth.table.ts";
import {
  CONSENT_PATH,
  MCP_URL,
  SIGN_IN_PATH,
  SITE_NAME,
  SITE_ORIGIN,
} from "#/shared/config/index.ts";
import { databaseOf } from "#/shared/db/index.server.ts";

const OWNER_INVITE_HASH =
  "a6f8d888f1b83ee5cdc18e833b7c9b08:f83925e6b19f06c9f373618768edb54ebf76092ef306d518680dc9480ef48ee434b7027c8dcdec48c0ed4ec7154846a0ddddf4289bfeed9728afffb3ab5e675c";

export type AuthBindings = Readonly<{ DB: D1Database; BETTER_AUTH_SECRET: string }>;

export const createAuth = (bindings: AuthBindings): Auth<OwnerAuthOptions> =>
  createOwnerAuth({
    origin: SITE_ORIGIN,
    db: databaseOf(bindings.DB),
    schema: { jwks, oauthClientAssertion, verification },
    secret: bindings.BETTER_AUTH_SECRET,
    owner: { inviteHash: OWNER_INVITE_HASH, ownerName: "masseater", rpName: SITE_NAME },
    loginPage: SIGN_IN_PATH,
    consentPage: CONSENT_PATH,
    resource: MCP_URL,
  });

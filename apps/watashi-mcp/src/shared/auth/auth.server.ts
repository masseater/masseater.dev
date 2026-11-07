import { createOwnerAuth } from "@masseater.dev/owner-auth/server";
import type { OwnerAuthOptions } from "@masseater.dev/owner-auth/server";
import type { Auth } from "better-auth";
import { env } from "cloudflare:workers";

import { CONSENT_PATH, MCP_URL, SIGN_IN_PATH, SITE_NAME, SITE_ORIGIN } from "#/shared/config";
import { db } from "#/shared/db/index.server";

const OWNER_INVITE_HASH =
  "a6f8d888f1b83ee5cdc18e833b7c9b08:f83925e6b19f06c9f373618768edb54ebf76092ef306d518680dc9480ef48ee434b7027c8dcdec48c0ed4ec7154846a0ddddf4289bfeed9728afffb3ab5e675c";

const createAuth = (): Auth<OwnerAuthOptions> =>
  createOwnerAuth({
    origin: SITE_ORIGIN,
    db,
    secret: env.BETTER_AUTH_SECRET,
    owner: { inviteHash: OWNER_INVITE_HASH, ownerName: "masseater", rpName: SITE_NAME },
    loginPage: SIGN_IN_PATH,
    consentPage: CONSENT_PATH,
    resource: MCP_URL,
  });

export { createAuth };

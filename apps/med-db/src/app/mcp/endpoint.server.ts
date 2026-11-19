import { requireMcpAuth } from "@better-auth/mcp";
import { authInfoOf } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";

import { buildServer } from "./build-server.server.ts";

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(
    createAuth(),
    (authorized, claims) =>
      createMcpHandler(buildServer).fetch(authorized, {
        authInfo: authInfoOf({ azp: claims["azp"], clientId: claims["client_id"] }),
      }),
    { resource: MCP_URL },
  )(request);

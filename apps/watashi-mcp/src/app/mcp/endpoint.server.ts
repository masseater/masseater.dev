import { requireMcpAuth } from "@better-auth/mcp";
import { callerOf } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createAuth } from "#/shared/auth/index.server";
import { MCP_URL } from "#/shared/config";

import { registerTools } from "./tools.server";

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(
    createAuth(),
    (authorized, claims) =>
      createMcpHandler(() =>
        registerTools(
          callerOf({ request: authorized, azp: claims["azp"], clientId: claims["client_id"] }),
        ),
      ).fetch(authorized),
    { resource: MCP_URL },
  )(request);

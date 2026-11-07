import { requireMcpAuth } from "@better-auth/mcp";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { createAuth } from "#/shared/auth/index.server";
import { MCP_URL, SITE_NAME, SITE_ORIGIN } from "#/shared/config";

import { callerOf } from "./caller";
import { registerMemoryTools } from "./memory-tools.server";

const SERVER_INFO = { name: SITE_NAME, version: "0.0.0", websiteUrl: SITE_ORIGIN };

const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(
    createAuth(),
    (authorized, claims) =>
      createMcpHandler(() =>
        pipe(
          new McpServer(SERVER_INFO),
          registerMemoryTools(
            callerOf({ request: authorized, azp: claims["azp"], clientId: claims["client_id"] }),
          ),
        ),
      ).fetch(authorized),
    { resource: MCP_URL },
  )(request);

export { serveMcp };

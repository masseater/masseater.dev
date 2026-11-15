import { requireMcpAuth } from "@better-auth/mcp";
import type { Caller } from "@masseater.dev/mcp-tool-call";
import { callerOf } from "@masseater.dev/mcp-tool-call";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerConversationTools } from "#/features/conversation-tools/index.server.ts";
import { registerLifeTools } from "#/features/life-tools/index.server.ts";
import { registerWatashiTools } from "#/features/memory-tools/index.server.ts";
import { registerTokenTools } from "#/features/token-tools/index.server.ts";
import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL, SITE_NAME, SITE_ORIGIN } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SITE_NAME, version: "0.0.0", websiteUrl: SITE_ORIGIN };

const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerLifeTools(caller),
    registerWatashiTools(caller),
    registerConversationTools(caller),
    registerTokenTools(caller),
  );

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

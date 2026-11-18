import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";

import { buildServer } from "./build-server.server.ts";

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(createAuth(), (authorized) => createMcpHandler(buildServer).fetch(authorized), {
    resource: MCP_URL,
  })(request);

import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createAuth } from "#/shared/auth/index.server";
import { MCP_URL } from "#/shared/config";

import { buildServer } from "./build-server.server";

const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(createAuth(), (authorized) => createMcpHandler(buildServer).fetch(authorized), {
    resource: MCP_URL,
  })(request);

export { serveMcp };

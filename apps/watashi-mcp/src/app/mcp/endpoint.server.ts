import { requireMcpAuth } from "@better-auth/mcp";
import { meteredMcpHandler } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";

import { registerTools } from "./tools.server.ts";

const handler = meteredMcpHandler(env.TOOL_CALLS)(registerTools);

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(
    createAuth(),
    (authorized, claims) =>
      handler(authorized, { azp: claims["azp"], clientId: claims["client_id"] }),
    { resource: MCP_URL },
  )(request);

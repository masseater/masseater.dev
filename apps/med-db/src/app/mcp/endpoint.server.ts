import { requireMcpAuth } from "@better-auth/mcp";
import { meteredMcpHandler } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";
import { catalogDbOf } from "#/shared/db/index.server.ts";

import { buildServer } from "./build-server.server.ts";

const catalog = catalogDbOf(env.DB);

const handler = meteredMcpHandler(env.TOOL_CALLS)(() => buildServer(catalog));

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(createAuth(env), handler, { resource: MCP_URL })(request);

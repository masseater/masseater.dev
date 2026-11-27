import { requireMcpAuth } from "@better-auth/mcp";
import { meteredMcpHandler } from "@masseater.dev/mcp-tool-call";
import { floodGuarded } from "@masseater.dev/owner-auth/server";
import { env } from "cloudflare:workers";

import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";

import { gateOf, toolRunOf } from "./bindings.server.ts";
import { serveApiTokens, serveConversations, serveMemories } from "./conversation-api.server.ts";
import { registerTools } from "./tools.server.ts";

const handler = meteredMcpHandler(env.TOOL_CALLS)(registerTools(toolRunOf(env)));

export const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(createAuth(env), handler, { resource: MCP_URL })(request);

const gate = gateOf(env);

export const handleConversations = serveConversations(gate);

export const handleMemories = serveMemories(gate);

export const handleApiTokens = serveApiTokens(gate);

export const handleAuth = floodGuarded(env.AUTH_LIMITER)((request) =>
  createAuth(env).handler(request),
);

import { MeteredMcpServer } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";

import { registerSearchTools } from "#/features/search-posts/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (): McpServer =>
  registerSearchTools(new MeteredMcpServer(SERVER_INFO, env.TOOL_CALLS));

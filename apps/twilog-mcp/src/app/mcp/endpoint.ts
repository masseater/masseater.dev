import { accessMcpRoute } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";

import type { AppEnv } from "#/shared/config/index.ts";

import { registerTools } from "./tools.ts";

export const serveMcp = accessMcpRoute<AppEnv>((env) => ({
  teamDomain: env.ACCESS_TEAM_DOMAIN,
  audience: env.ACCESS_AUDIENCE,
  register: (): McpServer => registerTools(env.ACCESS_OAUTH),
  dataset: env.TOOL_CALLS,
}));

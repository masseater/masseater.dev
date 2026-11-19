import { MeteredMcpServer } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { pipe } from "effect";

import { registerTokenTools } from "#/features/issue-tokens/index.server.ts";
import { registerWatashiTools } from "#/features/manage-memory/index.server.ts";
import { registerLifeTools } from "#/features/record-life/index.server.ts";
import { registerConversationTools } from "#/features/store-conversations/index.server.ts";
import { SITE_NAME, SITE_ORIGIN } from "#/shared/config/index.ts";

import { registerMoneyTools } from "./money-tools.server.ts";

const SERVER_INFO = { name: SITE_NAME, version: "0.0.0", websiteUrl: SITE_ORIGIN };

export const registerTools = (): McpServer =>
  pipe(
    new MeteredMcpServer(SERVER_INFO, env.TOOL_CALLS),
    registerLifeTools,
    registerWatashiTools,
    registerConversationTools,
    registerTokenTools,
    registerMoneyTools,
  );

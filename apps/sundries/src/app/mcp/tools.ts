import { MeteredMcpServer } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { pipe } from "effect";

import { registerBrokerTools } from "#/features/broker-credentials/index.ts";
import { registerSloppediaTools } from "#/features/edit-sloppedia/index.ts";
import { registerAnalyticsTools } from "#/features/query-analytics/index.ts";
import { registerClaudeRequestTools } from "#/features/request-claude/index.ts";
import { registerSlideTools } from "#/features/search-slides/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (): McpServer =>
  pipe(
    new MeteredMcpServer(SERVER_INFO, env.TOOL_CALLS),
    registerSloppediaTools,
    registerAnalyticsTools,
    registerSlideTools,
    registerBrokerTools,
    registerClaudeRequestTools,
  );

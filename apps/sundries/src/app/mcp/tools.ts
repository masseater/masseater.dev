import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerBrokerTools } from "#/features/broker-credentials/index.ts";
import { registerSloppediaTools } from "#/features/edit-sloppedia/index.ts";
import { registerAnalyticsTools } from "#/features/query-analytics/index.ts";
import { registerClaudeRequestTools } from "#/features/request-claude/index.ts";
import { registerSlideTools } from "#/features/search-slides/index.ts";
import { registerTranslateTools } from "#/features/translate-text/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerSloppediaTools(caller),
    registerAnalyticsTools(caller),
    registerSlideTools(caller),
    registerBrokerTools(caller),
    registerTranslateTools(caller),
    registerClaudeRequestTools(caller),
  );

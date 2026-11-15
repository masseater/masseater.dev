import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerAnalyticsTools } from "#/features/analytics";
import { registerBrokerTools } from "#/features/broker-credentials";
import { registerClaudeRequestTools } from "#/features/claude-request";
import { registerSlideTools } from "#/features/slides-search";
import { registerSloppediaTools } from "#/features/sloppedia";
import { registerTranslateTools } from "#/features/translate";
import { SERVER_NAME } from "#/shared/config";

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

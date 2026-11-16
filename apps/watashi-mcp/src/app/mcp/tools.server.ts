import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerConversationTools } from "#/features/conversation-tools/index.server.ts";
import { registerLifeTools } from "#/features/life-tools/index.server.ts";
import { registerWatashiTools } from "#/features/memory-tools/index.server.ts";
import { registerTokenTools } from "#/features/token-tools/index.server.ts";
import { SITE_NAME, SITE_ORIGIN } from "#/shared/config/index.ts";

import { registerMoneyTools } from "./money-tools.server.ts";

const SERVER_INFO = { name: SITE_NAME, version: "0.0.0", websiteUrl: SITE_ORIGIN };

export const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerLifeTools(caller),
    registerWatashiTools(caller),
    registerConversationTools(caller),
    registerTokenTools(caller),
    registerMoneyTools(caller),
  );

import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerTokenTools } from "#/features/issue-tokens/index.server.ts";
import { registerWatashiTools } from "#/features/manage-memory/index.server.ts";
import { registerLifeTools } from "#/features/record-life/index.server.ts";
import { registerConversationTools } from "#/features/store-conversations/index.server.ts";
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

import type { Caller } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { flow } from "effect";

import { registerCategoryTools } from "#/features/categorize/index.server";
import { registerLedgerTools } from "#/features/import-statements/index.server";
import { registerReportTools } from "#/features/report/index.server";

export const registerMoneyTools = (caller: Caller): ((server: McpServer) => McpServer) =>
  flow(registerLedgerTools(caller), registerCategoryTools(caller), registerReportTools(caller));

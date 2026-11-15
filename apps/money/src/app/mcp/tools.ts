import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerCategoryTools } from "#/features/categorize";
import { registerLedgerTools } from "#/features/import-statements";
import { registerReportTools } from "#/features/report";
import { SERVER_NAME } from "#/shared/config";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerLedgerTools(caller),
    registerCategoryTools(caller),
    registerReportTools(caller),
  );

export { registerTools };

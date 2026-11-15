import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerCategoryTools } from "#/features/categorize/index.ts";
import { registerLedgerTools } from "#/features/import-statements/index.ts";
import { registerReportTools } from "#/features/report/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerLedgerTools(caller),
    registerCategoryTools(caller),
    registerReportTools(caller),
  );

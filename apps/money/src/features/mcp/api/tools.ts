import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { SERVER_NAME } from "#/shared/config";

import { registerCategoryTools } from "./category-tools";
import { registerLedgerTools } from "./ledger-tools";
import { registerReportTools } from "./report-tools";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerLedgerTools(caller),
    registerCategoryTools(caller),
    registerReportTools(caller),
  );

export { registerTools };

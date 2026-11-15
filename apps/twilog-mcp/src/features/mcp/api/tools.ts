import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";

import { SERVER_NAME } from "#/shared/config";

import { registerSearchTools } from "./search-tools";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (caller: Caller): McpServer =>
  registerSearchTools(caller)(new McpServer(SERVER_INFO));

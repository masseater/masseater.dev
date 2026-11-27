import { McpServer } from "@modelcontextprotocol/server";

import { registerSearchTools } from "#/features/search-posts/index.ts";
import type { TokenBroker } from "#/features/search-posts/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const registerTools = (broker: TokenBroker): McpServer =>
  registerSearchTools(broker)(new McpServer(SERVER_INFO));

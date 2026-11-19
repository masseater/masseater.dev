import type { McpServer } from "@modelcontextprotocol/server";
import { flow } from "effect";

import { registerAccessTokenTools } from "./access-token-tools.ts";
import { registerTailnetTools } from "./tailnet-tools.ts";

export const registerBrokerTools: (server: McpServer) => McpServer = flow(
  registerAccessTokenTools,
  registerTailnetTools,
);

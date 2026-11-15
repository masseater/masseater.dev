import type { Caller } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { flow } from "effect";

import { registerAccessTokenTools } from "./access-token-tools";
import { registerTailnetTools } from "./tailnet-tools";

const registerBrokerTools = (caller: Caller): ((server: McpServer) => McpServer) =>
  flow(registerAccessTokenTools(caller), registerTailnetTools(caller));

export { registerBrokerTools };

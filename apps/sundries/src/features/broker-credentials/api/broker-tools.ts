import type { McpServer } from "@modelcontextprotocol/server";
import { flow } from "effect";

import { registerAccessTokenTools } from "./access-token-tools.ts";
import type { AccessTokens } from "./access-token-tools.ts";
import { registerTailnetTools } from "./tailnet-tools.ts";
import type { Tailnet } from "./tailnet-tools.ts";

export type BrokerBindings = Readonly<{ ACCESS_OAUTH: AccessTokens; TAILNET: Tailnet }>;

export const registerBrokerTools = (bindings: BrokerBindings): ((server: McpServer) => McpServer) =>
  flow(registerAccessTokenTools(bindings.ACCESS_OAUTH), registerTailnetTools(bindings.TAILNET));

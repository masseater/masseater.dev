import type { Caller } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { SERVER_NAME } from "#/shared/config";

import { registerAnalyticsTools } from "./analytics-tools";
import { registerSlideTools } from "./slides-tools";
import { registerSloppediaTools } from "./sloppedia-tools";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

const registerTools = (caller: Caller): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerSloppediaTools(caller),
    registerAnalyticsTools(caller),
    registerSlideTools(caller),
  );

export { registerTools };

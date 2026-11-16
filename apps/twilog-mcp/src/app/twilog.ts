import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp/index.ts";
import { MCP_PATH } from "#/shared/config/index.ts";

export default mcpWorker({ path: MCP_PATH, serve: serveMcp });

import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp";
import { MCP_PATH } from "#/shared/config";

export default mcpWorker({ path: MCP_PATH, serve: serveMcp });

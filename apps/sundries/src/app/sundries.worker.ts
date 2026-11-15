import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/features/mcp";
import { MCP_PATH } from "#/shared/config";

export default mcpWorker(MCP_PATH, serveMcp);

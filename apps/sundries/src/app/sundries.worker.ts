import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/features/mcp";
import { MCP_PATH } from "#/shared/config";

export { ClaudeRequests, Slides } from "#/features/mcp";

export default mcpWorker({ path: MCP_PATH, serve: serveMcp });

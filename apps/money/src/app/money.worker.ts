import { mcpWorker } from "@masseater.dev/mcp-tool-call";

import { serveMcp } from "#/app/mcp";
import { MCP_PATH } from "#/shared/config";

export { MoneyPortal } from "#/app/mcp";
export default mcpWorker({ path: MCP_PATH, serve: serveMcp });

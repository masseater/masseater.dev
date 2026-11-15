import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolCalls } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

export const { meteredInput, runToolIn, runTool } = toolCalls<UpstreamFailed>({
  dataset: () => env.TOOL_CALLS,
  describe: ({ service, message }) => ({
    errorTag: "UpstreamFailed",
    text: `${service} failed: ${message}`,
  }),
});

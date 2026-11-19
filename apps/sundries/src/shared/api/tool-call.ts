import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolCalls } from "@masseater.dev/mcp-tool-call";

export const { runToolIn, runTool } = toolCalls<UpstreamFailed>({
  describe: ({ service, message }) => ({
    errorTag: "UpstreamFailed",
    text: `${service} failed: ${message}`,
  }),
});

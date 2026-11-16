import { accessMcpEndpoint } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

import { serveMarks, registerTools } from "#/features/serve-marks/index.ts";
import { MCP_PATH } from "#/shared/config/index.ts";

const serveMcp = accessMcpEndpoint({
  teamDomain: env.ACCESS_TEAM_DOMAIN,
  audience: env.ACCESS_AUDIENCE,
  register: registerTools,
});

const worker = {
  fetch: (request: Request): Promise<Response> => {
    if (new URL(request.url).pathname === MCP_PATH) {
      return serveMcp(request);
    }
    return serveMarks(request);
  },
} satisfies ExportedHandler;

export default worker;

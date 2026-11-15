import { accessMcpEndpoint } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";

import { registerTools } from "./tools";

const serveMcp = accessMcpEndpoint({
  teamDomain: env.ACCESS_TEAM_DOMAIN,
  audience: env.ACCESS_AUDIENCE,
  register: registerTools,
});

export { serveMcp };

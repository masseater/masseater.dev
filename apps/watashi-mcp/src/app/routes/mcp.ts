import { mcpHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { serveMcp } from "#/features/mcp/index.server";

const Route = createFileRoute("/mcp")({ server: { handlers: mcpHandlers(serveMcp) } });

export { Route };

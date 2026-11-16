import { mcpHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { serveMcp } from "#/app/mcp/index.server.ts";

export const Route = createFileRoute("/mcp")({ server: { handlers: mcpHandlers(serveMcp) } });

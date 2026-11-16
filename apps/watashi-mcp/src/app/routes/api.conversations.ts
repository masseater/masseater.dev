import { createFileRoute } from "@tanstack/react-router";

import { serveConversations } from "#/app/mcp/index.server.ts";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveConversations(request);

export const Route = createFileRoute("/api/conversations")({
  server: { handlers: { GET: handle, PUT: handle } },
});

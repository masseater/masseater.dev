import { createFileRoute } from "@tanstack/react-router";

import { serveConversations } from "#/features/mcp/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveConversations(request);

const Route = createFileRoute("/api/conversations")({
  server: { handlers: { GET: handle, PUT: handle } },
});

export { Route };

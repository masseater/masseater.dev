import { createFileRoute } from "@tanstack/react-router";

import { handleConversations } from "#/app/mcp/index.server.ts";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  handleConversations(request);

export const Route = createFileRoute("/api/conversations")({
  server: { handlers: { GET: handle, PUT: handle } },
});

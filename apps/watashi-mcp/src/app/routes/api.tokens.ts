import { createFileRoute } from "@tanstack/react-router";

import { serveApiTokens } from "#/app/mcp/index.server.ts";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveApiTokens(request);

export const Route = createFileRoute("/api/tokens")({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});

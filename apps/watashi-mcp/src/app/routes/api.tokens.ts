import { createFileRoute } from "@tanstack/react-router";

import { serveApiTokens } from "#/features/mcp/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveApiTokens(request);

const Route = createFileRoute("/api/tokens")({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});

export { Route };

import { createFileRoute } from "@tanstack/react-router";

import { handleApiTokens } from "#/app/mcp/index.server.ts";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  handleApiTokens(request);

export const Route = createFileRoute("/api/tokens")({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});

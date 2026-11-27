import { createFileRoute } from "@tanstack/react-router";

import { handleMemories } from "#/app/mcp/index.server.ts";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  handleMemories(request);

export const Route = createFileRoute("/api/memories")({
  server: { handlers: { PUT: handle, ANY: handle } },
});

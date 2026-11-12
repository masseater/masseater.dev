import { createFileRoute } from "@tanstack/react-router";

import { serveMemories } from "#/features/mcp/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveMemories(request);

const Route = createFileRoute("/api/memories")({
  server: { handlers: { PUT: handle } },
});

export { Route };

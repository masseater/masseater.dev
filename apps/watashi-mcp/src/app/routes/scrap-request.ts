import { createFileRoute } from "@tanstack/react-router";

import { serveScrapRequest } from "#/features/scrap-request/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveScrapRequest(request);

const Route = createFileRoute("/scrap-request")({
  server: { handlers: { GET: handle, POST: handle } },
});

export { Route };

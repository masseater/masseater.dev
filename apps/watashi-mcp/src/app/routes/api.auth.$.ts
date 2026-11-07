import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "#/shared/auth/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  createAuth().handler(request);

const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});

export { Route };

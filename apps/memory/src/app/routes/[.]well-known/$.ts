import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "#/shared/auth/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  createAuth().handler(request);

const Route = createFileRoute("/.well-known/$")({
  server: { handlers: { GET: handle } },
});

export { Route };

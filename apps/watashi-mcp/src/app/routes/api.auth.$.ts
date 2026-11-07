import { authHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "#/shared/auth/index.server";

const Route = createFileRoute("/api/auth/$")({
  server: { handlers: authHandlers((request) => createAuth().handler(request)) },
});

export { Route };

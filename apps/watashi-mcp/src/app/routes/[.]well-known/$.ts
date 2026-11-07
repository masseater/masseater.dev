import { wellKnownHandlers } from "@masseater.dev/owner-auth/server";
import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "#/shared/auth/index.server";

const Route = createFileRoute("/.well-known/$")({
  server: { handlers: wellKnownHandlers((request) => createAuth().handler(request)) },
});

export { Route };

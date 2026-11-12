import { securedResponse } from "security-headers/response";

import { serveMcp } from "#/features/mcp";
import { MCP_PATH } from "#/shared/config";

type Route = (request: Request) => Promise<Response>;

const NOT_FOUND = 404;

const notFound: Route = () => Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

const ROUTES: Readonly<Record<string, Route>> = { [MCP_PATH]: serveMcp };

export default {
  fetch: (request: Request): Promise<Response> =>
    securedResponse(() => (ROUTES[new URL(request.url).pathname] ?? notFound)(request)),
} satisfies ExportedHandler;

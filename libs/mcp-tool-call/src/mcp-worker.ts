import { securedResponse } from "security-headers/response";

type Route = (request: Request) => Promise<Response>;

const NOT_FOUND = 404;

const notFound: Route = () => Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

const mcpWorker = (path: string, serve: Route): ExportedHandler => ({
  fetch: (request) =>
    securedResponse(() => (new URL(request.url).pathname === path ? serve : notFound)(request)),
});

export { mcpWorker };

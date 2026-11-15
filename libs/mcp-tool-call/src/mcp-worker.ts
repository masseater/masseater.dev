import { securedResponse } from "security-headers/response";

type Route = (request: Request) => Promise<Response>;

type McpWorker = Readonly<{ path: string; serve: Route }>;

const NOT_FOUND = 404;

const notFound: Route = () => Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

const mcpWorker = ({ path, serve }: McpWorker): ExportedHandler => {
  const routes: Readonly<Record<string, Route>> = { [path]: serve };
  return {
    fetch: (request) =>
      securedResponse(() => (routes[new URL(request.url).pathname] ?? notFound)(request)),
  };
};

export { mcpWorker };
export type { McpWorker, Route };

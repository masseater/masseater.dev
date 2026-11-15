import { securedResponse } from "security-headers/response";

type Route = (request: Request) => Promise<Response>;

const NOT_FOUND = 404;

const notFound: Route = () => Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

export const mcpWorker = ({
  path,
  serve,
}: Readonly<{ path: string; serve: (request: Request) => Promise<Response> }>): ExportedHandler => {
  const routes: Readonly<Record<string, Route>> = { [path]: serve };
  return {
    fetch: (request: Request): Promise<Response> =>
      securedResponse(() => (routes[new URL(request.url).pathname] ?? notFound)(request)),
  };
};

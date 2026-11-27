import { securedResponse } from "security-headers/response";

export type Route<Env> = (env: Env) => (request: Request) => Promise<Response>;

const NOT_FOUND = 404;

const notFound = (): (() => Promise<Response>) => () =>
  Promise.resolve(new Response("Not Found", { status: NOT_FOUND }));

export const mcpWorker = <Env>({
  path,
  serve,
}: Readonly<{ path: string; serve: Route<Env> }>): ExportedHandler<Env> => {
  const routes: Readonly<Record<string, Route<Env>>> = { [path]: serve };
  return {
    fetch: (request: Request, env: Env): Promise<Response> =>
      securedResponse(() => (routes[new URL(request.url).pathname] ?? notFound)(env)(request)),
  };
};

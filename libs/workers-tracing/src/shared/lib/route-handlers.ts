export type Handle = (request: Request) => Promise<Response>;

export type RouteHandler = (context: Readonly<{ request: Request }>) => Promise<Response>;

export interface RouteHandlers {
  readonly GET: RouteHandler;
  readonly POST: RouteHandler;
  readonly PUT: RouteHandler;
  readonly PATCH: RouteHandler;
  readonly DELETE: RouteHandler;
}

export const routeHandlers = (handle: Handle): RouteHandlers => {
  const handler: RouteHandler = ({ request }) => handle(request);
  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler };
};

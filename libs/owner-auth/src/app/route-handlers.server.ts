export type Serve = (request: Request) => Promise<Response>;

export type RequestHandler = (context: Readonly<{ request: Request }>) => Promise<Response>;

const forRequest =
  (serve: Serve): RequestHandler =>
  ({ request }) =>
    serve(request);

export const mcpHandlers = (
  serve: Serve,
): Readonly<{ GET: RequestHandler; POST: RequestHandler; DELETE: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle, DELETE: handle };
};

export const authHandlers = (
  serve: Serve,
): Readonly<{ GET: RequestHandler; POST: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle };
};

export const wellKnownHandlers = (serve: Serve): Readonly<{ GET: RequestHandler }> => ({
  GET: forRequest(serve),
});

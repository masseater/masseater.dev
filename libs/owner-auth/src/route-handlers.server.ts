type Serve = (request: Request) => Promise<Response>;

type RequestHandler = (context: Readonly<{ request: Request }>) => Promise<Response>;

const forRequest =
  (serve: Serve): RequestHandler =>
  ({ request }) =>
    serve(request);

const mcpHandlers = (
  serve: Serve,
): Readonly<{ GET: RequestHandler; POST: RequestHandler; DELETE: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle, DELETE: handle };
};

const authHandlers = (serve: Serve): Readonly<{ GET: RequestHandler; POST: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle };
};

const wellKnownHandlers = (serve: Serve): Readonly<{ GET: RequestHandler }> => ({
  GET: forRequest(serve),
});

export { authHandlers, mcpHandlers, wellKnownHandlers };
export type { RequestHandler, Serve };

const OK = 200;
export const BAD_REQUEST = 400;
export const UNAUTHORIZED = 401;
export const FORBIDDEN = 403;
export const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
export const CONFLICT = 409;
export const TOO_LARGE = 413;
const SERVER_ERROR = 500;

export const withStatus =
  (status: number) =>
  (body: unknown): Response =>
    Response.json(body, { status });

export const json = withStatus(OK);

export const storageFailed = (): Response => withStatus(SERVER_ERROR)({ error: "storage failed" });

export const methodNotAllowed = (): Response =>
  withStatus(METHOD_NOT_ALLOWED)({ error: "method not allowed" });

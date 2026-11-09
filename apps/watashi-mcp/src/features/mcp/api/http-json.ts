const OK = 200;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const CONFLICT = 409;
const TOO_LARGE = 413;
const SERVER_ERROR = 500;

const withStatus =
  (status: number) =>
  (body: unknown): Response =>
    Response.json(body, { status });

const json = withStatus(OK);

const storageFailed = (): Response => withStatus(SERVER_ERROR)({ error: "storage failed" });

const methodNotAllowed = (): Response =>
  withStatus(METHOD_NOT_ALLOWED)({ error: "method not allowed" });

export {
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  NOT_FOUND,
  TOO_LARGE,
  UNAUTHORIZED,
  json,
  methodNotAllowed,
  storageFailed,
  withStatus,
};

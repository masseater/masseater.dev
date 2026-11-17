const CBOR = "application/cbor";
const OCTET_STREAM = "application/octet-stream";
const NO_STORE = "no-store";

export const STATUS = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  tooLarge: 413,
  tooMany: 429,
  serverError: 500,
} as const;

export const status = (code: number): Response => new Response("", { status: code });

export const cbor = (body: Uint8Array<ArrayBuffer>): Response =>
  new Response(body, {
    headers: { "content-type": CBOR, "cache-control": NO_STORE },
  });

export const stream =
  (length: number) =>
  (body: ReadableStream): Response =>
    new Response(body, {
      headers: {
        "content-type": OCTET_STREAM,
        "content-length": String(length),
        "cache-control": NO_STORE,
      },
    });

import { decode, encode } from "cborg";
import { Effect, Option, Schema } from "effect";

import { CI_TOKEN, NAMESPACE, verifyToken } from "#/app/token.test.support.ts";
import { TokenVerifier } from "#/features/admit-caller/index.ts";
import { joined } from "#/shared/lib/bytes.ts";
import { withStore } from "#/shared/lib/cloudflare.test.support.ts";

import { routed as served } from "./routes.ts";

const routed = (request: Request): Effect.Effect<Response> =>
  withStore(served(request).pipe(Effect.provideService(TokenVerifier, verifyToken)));

const BOUNDARY = "vp-boundary";
const ENDPOINT = `https://task-cache.masseater.dev/projects/${NAMESPACE}`;
const encoder = new TextEncoder();

const Candidate = Schema.Struct({
  value: Schema.Uint8Array,
  blob_id: Schema.NullOr(Schema.String),
});

const Candidates = Schema.Struct({ kind: Schema.String, entries: Schema.Array(Candidate) });

export type Found = typeof Candidates.Type;

export const anonymous: Option.Option<string> = Option.none();

const ci: Option.Option<string> = Option.some(CI_TOKEN);

const headersOf = (caller: Option.Option<string>, contentType: string): Record<string, string> => ({
  "content-type": contentType,
  ...Option.match(caller, {
    onNone: () => ({}),
    onSome: (token) => ({ authorization: `Bearer ${token}` }),
  }),
});

const partHead = (name: string, type: string): Uint8Array =>
  encoder.encode(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: ${type}\r\n\r\n`,
  );

const CRLF = encoder.encode("\r\n");

export interface Stored {
  readonly key: Uint8Array;
  readonly value: Uint8Array;
  readonly blob: Option.Option<Uint8Array>;
}

const TASK = encoder.encode("task");

const multipartOf = ({ key, value, blob }: Stored): Uint8Array<ArrayBuffer> =>
  joined([
    partHead("metadata", "application/cbor"),
    encode({ key, secondary_key: TASK, value }),
    CRLF,
    ...Option.match(blob, {
      onNone: () => [],
      onSome: (bytes) => [partHead("blob", "application/octet-stream"), bytes, CRLF],
    }),
    encoder.encode(`--${BOUNDARY}--\r\n`),
  ]);

export const storeAs =
  (caller: Option.Option<string>) =>
  (stored: Stored): Effect.Effect<Response> =>
    routed(
      new Request(`${ENDPOINT}/store`, {
        method: "POST",
        headers: headersOf(caller, `multipart/form-data; boundary=${BOUNDARY}`),
        body: multipartOf(stored),
      }),
    );

export const store = storeAs(ci);

export const lookup = (key: Uint8Array): Effect.Effect<Response> =>
  routed(
    new Request(`${ENDPOINT}/fetch`, {
      method: "POST",
      headers: headersOf(anonymous, "application/cbor"),
      body: encode({ key, secondary_key: TASK }),
    }),
  );

const decoded = (buffer: ArrayBuffer): unknown => decode(new Uint8Array(buffer));

export const candidatesOf = (response: Response): Effect.Effect<Found, Schema.SchemaError> =>
  Effect.promise(() => response.arrayBuffer()).pipe(
    Effect.map(decoded),
    Effect.flatMap(Schema.decodeUnknownEffect(Candidates)),
  );

export const found = (key: Uint8Array): Effect.Effect<Found, Schema.SchemaError> =>
  lookup(key).pipe(Effect.flatMap(candidatesOf));

export const blobResponse = (id: string): Effect.Effect<Response> =>
  routed(new Request(`${ENDPOINT}/blob/${id}`));

export const blob = (id: string): Effect.Effect<Uint8Array> =>
  blobResponse(id).pipe(
    Effect.flatMap((response) => Effect.promise(() => response.arrayBuffer())),
    Effect.map((buffer) => new Uint8Array(buffer)),
  );

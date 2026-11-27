import { env } from "cloudflare:workers";
import { Effect, Option, pipe } from "effect";

import { isPublic } from "#/entities/entry/index.ts";
import type { BlobRef } from "#/entities/entry/index.ts";
import { spendUpload } from "#/entities/spending/index.ts";
import { admitsWriter } from "#/features/admit-caller/index.ts";
import type { Target } from "#/features/admit-caller/index.ts";
import { fetchEntries, readBlob, storeEntry } from "#/features/serve-entries/index.ts";
import { Limits } from "#/shared/config/index.ts";
import type { Malformed } from "#/shared/lib/malformed.ts";
import { STATUS, status } from "#/shared/lib/responses.ts";
import type { StoreFailed } from "#/shared/lib/store-failed.ts";

const ROUTE =
  /^\/projects\/(?<namespace>[a-z0-9][a-z0-9._-]{0,62})\/(?:(?<plain>fetch|store)|blob\/(?<blob>[0-9]{1,15})-(?<key>[0-9a-f]{64}))$/u;

const FETCH = "POST fetch";
const STORE = "POST store";
const BLOB = "GET blob";
const BLOB_OPERATION = "blob";
const NO_LENGTH = "0";
const NO_TYPE = "";
const UNKNOWN_CALLER = "unknown";

interface Routed extends Target {
  readonly action: string;
  readonly blob: Option.Option<BlobRef>;
}

const routeOf = (request: Request): Option.Option<Routed> => {
  const url = new URL(request.url);
  const groups = Option.flatMapNullishOr(
    Option.fromNullishOr(ROUTE.exec(url.pathname)),
    (matched) => matched.groups,
  );
  return pipe(
    groups,
    Option.bindTo("found"),
    Option.bind("namespace", ({ found }) => Option.fromNullishOr(found["namespace"])),
    Option.map(({ found, namespace }): Routed => ({
      namespace,
      audience: `${url.origin}/projects/${namespace}`,
      action: `${request.method} ${found["plain"] ?? BLOB_OPERATION}`,
      blob: Option.all({
        id: pipe(Option.fromNullishOr(found["blob"]), Option.map(Number)),
        key: Option.fromNullishOr(found["key"]),
      }),
    })),
  );
};

const bodyOf = Effect.fn("routes.bodyOf")(function* bodyOf(request: Request) {
  const limits = yield* Limits;
  const declared = Number(request.headers.get("content-length") ?? NO_LENGTH);
  if (declared > limits.requestBytes) {
    return Option.none<Uint8Array>();
  }
  const buffer = yield* Effect.promise(() => request.arrayBuffer());
  return Option.liftPredicate(
    new Uint8Array(buffer),
    (bytes) => bytes.length <= limits.requestBytes,
  );
});

const stored = Effect.fn("routes.stored")(function* stored(request: Request, route: Routed) {
  const admitted = yield* admitsWriter(request, route);
  if (!admitted) {
    return status(STATUS.unauthorized);
  }
  const body = yield* bodyOf(request);
  if (Option.isNone(body)) {
    return status(STATUS.tooLarge);
  }
  const affordable = yield* spendUpload;
  if (!affordable) {
    return status(STATUS.tooMany);
  }
  return yield* storeEntry({
    namespace: route.namespace,
    contentType: request.headers.get("content-type") ?? NO_TYPE,
    body: body.value,
  });
});

const fetched = Effect.fn("routes.fetched")(function* fetched(request: Request, route: Routed) {
  const open = yield* isPublic(route.namespace);
  if (!open) {
    return status(STATUS.notFound);
  }
  const body = yield* bodyOf(request);
  if (Option.isNone(body)) {
    return status(STATUS.tooLarge);
  }
  return yield* fetchEntries(route.namespace, body.value);
});

const blobRead = Effect.fn("routes.blobRead")(function* blobRead(_request: Request, route: Routed) {
  const open = yield* isPublic(route.namespace);
  if (!open || Option.isNone(route.blob)) {
    return status(STATUS.notFound);
  }
  return yield* readBlob(route.namespace, route.blob.value);
});

const HANDLERS: ReadonlyMap<
  string,
  (request: Request, route: Routed) => Effect.Effect<Response, Malformed | StoreFailed>
> = new Map([
  [FETCH, fetched],
  [STORE, stored],
  [BLOB, blobRead],
]);

const failed =
  (code: number) =>
  (failure: unknown): Effect.Effect<Response> =>
    Effect.logWarning("cache.request_failed", failure).pipe(Effect.as(status(code)));

const answered = (
  response: Effect.Effect<Response, Malformed | StoreFailed>,
): Effect.Effect<Response> =>
  response.pipe(
    Effect.catchTags({
      Malformed: failed(STATUS.badRequest),
      StoreFailed: failed(STATUS.serverError),
    }),
  );

const flooded = (request: Request): Effect.Effect<boolean> =>
  Effect.promise(() =>
    env.LIMITER.limit({ key: request.headers.get("cf-connecting-ip") ?? UNKNOWN_CALLER }),
  ).pipe(Effect.map((outcome) => !outcome.success));

export const routed = Effect.fn("routes.routed")(function* routed(request: Request) {
  const route = routeOf(request);
  if (Option.isNone(route)) {
    return status(STATUS.notFound);
  }
  const handler = Option.fromNullishOr(HANDLERS.get(route.value.action));
  if (Option.isNone(handler)) {
    return status(STATUS.notFound);
  }
  const over = yield* flooded(request);
  if (over) {
    return status(STATUS.tooMany);
  }
  return yield* answered(handler.value(request, route.value));
});

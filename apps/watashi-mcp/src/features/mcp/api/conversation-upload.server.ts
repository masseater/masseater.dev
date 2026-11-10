import { env } from "cloudflare:workers";
import { Clock, Effect, Option, Schema, String as Str, pipe } from "effect";

import { ChunkQuery, FileQuery, fileKeyOf, paramsOf } from "./conversation-query";
import type { ChunkParams } from "./conversation-query";
import { chunkAt, committedEnd } from "./conversation-store.server";
import type { FileKey } from "./conversation-store.server";
import { appendChunk } from "./conversation-writer.server";
import { BAD_REQUEST, CONFLICT, TOO_LARGE, json, storageFailed, withStatus } from "./http-json";
import type { Principal } from "./request-auth.server";
import { nowIso } from "./storage.server";
import type { WriteFailure } from "./storage.server";

type UploadStatus = "ok" | "conflict" | "error";

type Stored = Readonly<{ response: Response; status: UploadStatus }>;

type Upload = Readonly<{ params: ChunkParams; body: Uint8Array }>;

type Placed = Upload & Readonly<{ key: FileKey; objectKey: string }>;

const MAX_BODY_BYTES = 16_777_216;
const OFFSET_WIDTH = 12;
const FIRST_BYTE = 0;
const SECOND_BYTE = 1;
const GZIP_FIRST = 31;
const GZIP_SECOND = 139;

const isGzip = (body: Uint8Array): boolean =>
  body[FIRST_BYTE] === GZIP_FIRST && body[SECOND_BYTE] === GZIP_SECOND;

const objectKeyOf = ({ key, params }: Pick<Placed, "key" | "params">): string =>
  `${key.kind}/${key.sessionId}/${key.file}/${pipe(String(params.start), Str.padStart(OFFSET_WIDTH, "0"))}-${String(params.end)}.jsonl.gz`;

const conflictAt = (key: FileKey): Effect.Effect<Stored> =>
  committedEnd(key).pipe(
    Effect.map((expected) => ({
      response: withStatus(CONFLICT)({ expected }),
      status: "conflict" as const,
    })),
    Effect.orElseSucceed(() => ({ response: storageFailed(), status: "error" as const })),
  );

const discardLoser = ({ key, params, objectKey }: Placed): Effect.Effect<void> =>
  chunkAt({ ...key, start: params.start }).pipe(
    Effect.flatMap((winner) =>
      Option.match(
        pipe(
          winner,
          Option.filter((row) => row.objectKey === objectKey),
        ),
        {
          onSome: () => Effect.void,
          onNone: () => Effect.promise(() => env.CONVERSATIONS.delete(objectKey)),
        },
      ),
    ),
    Effect.ignore,
  );

const onAppendFailure =
  (placed: Placed) =>
  (failure: WriteFailure): Effect.Effect<Stored> =>
    Option.match(
      Option.liftPredicate(failure, (value) => value.duplicate),
      {
        onSome: () => discardLoser(placed).pipe(Effect.andThen(conflictAt(placed.key))),
        onNone: () =>
          Effect.logError("conversation.append_failed", failure.message).pipe(
            Effect.as({ response: storageFailed(), status: "error" as const }),
          ),
      },
    );

const commit = Effect.fn("conversation.commit")(function* commit(placed: Placed) {
  const at = yield* nowIso;
  const { params } = placed;
  return yield* appendChunk({
    ...placed.key,
    start: params.start,
    end: params.end,
    redactions: params.redactions,
    storedBytes: placed.body.byteLength,
    objectKey: placed.objectKey,
    at,
    cwd: params.cwd,
    source: params.source,
    remoteSession: params.remoteSession,
  }).pipe(
    Effect.as({ response: json({ committed: params.end }), status: "ok" as const }),
    Effect.catch(onAppendFailure(placed)),
  );
});

const place = Effect.fn("conversation.place")(function* place(upload: Upload) {
  const key = fileKeyOf(upload.params);
  const committed = yield* committedEnd(key);
  if (upload.params.start !== committed) {
    return { response: withStatus(CONFLICT)({ expected: committed }), status: "conflict" as const };
  }
  const objectKey = objectKeyOf({ key, params: upload.params });
  yield* Effect.promise(() =>
    env.CONVERSATIONS.put(objectKey, upload.body, {
      httpMetadata: { contentType: "application/gzip" },
    }),
  );
  return yield* commit({ ...upload, key, objectKey });
});

const record =
  (upload: Upload, principal: Principal) =>
  (outcome: Readonly<{ status: UploadStatus; latencyMs: number }>): Effect.Effect<void> => {
    const metrics = {
      rawBytes: upload.params.end - upload.params.start,
      storedBytes: upload.body.byteLength,
      redactions: upload.params.redactions,
    };
    return Effect.sync(() => {
      env.CONVERSATION_UPLOADS.writeDataPoint({
        indexes: [outcome.status],
        blobs: [outcome.status, upload.params.source, principal.via],
        doubles: [metrics.rawBytes, metrics.storedBytes, metrics.redactions, outcome.latencyMs],
      });
    }).pipe(
      Effect.andThen(Effect.logInfo("conversation upload")),
      Effect.annotateLogs({
        event: "conversation_upload",
        via: principal.via,
        source: upload.params.source,
        ...outcome,
        ...metrics,
      }),
    );
  };

const accept = Effect.fn("conversation.accept")(function* accept(
  upload: Upload,
  principal: Principal,
) {
  const startedAt = yield* Clock.currentTimeMillis;
  const stored: Stored = yield* place(upload).pipe(
    Effect.tapError((failure) => Effect.logError("conversation.store_failed", failure)),
    Effect.orElseSucceed(() => ({ response: storageFailed(), status: "error" as const })),
  );
  const finishedAt = yield* Clock.currentTimeMillis;
  yield* record(upload, principal)({ status: stored.status, latencyMs: finishedAt - startedAt });
  return stored.response;
});

const rejectBody = (body: Uint8Array): Option.Option<Response> =>
  Option.orElse(
    Option.liftPredicate(
      withStatus(TOO_LARGE)({ error: "body too large" }),
      () => body.byteLength > MAX_BODY_BYTES,
    ),
    () =>
      Option.liftPredicate(
        withStatus(BAD_REQUEST)({ error: "body must be gzip" }),
        () => !isGzip(body),
      ),
  );

const decodeChunkQuery = (request: Request): Option.Option<ChunkParams> =>
  pipe(
    Schema.decodeUnknownOption(ChunkQuery)(paramsOf(request)),
    Option.filter((params) => params.end > params.start),
  );

const upload = Effect.fn("conversation.upload")(function* upload(
  request: Request,
  principal: Principal,
) {
  const params = decodeChunkQuery(request);
  if (Option.isNone(params)) {
    return withStatus(BAD_REQUEST)({
      error: "kind・session・file・start・end・redactions・cwd・source・remoteSession を送る",
    });
  }
  const buffer = yield* Effect.promise(() => request.arrayBuffer());
  const body = new Uint8Array(buffer);
  return yield* Option.match(rejectBody(body), {
    onSome: Effect.succeed,
    onNone: () => accept({ params: params.value, body }, principal),
  });
});

const offset = (request: Request): Effect.Effect<Response> =>
  Option.match(Schema.decodeUnknownOption(FileQuery)(paramsOf(request)), {
    onNone: () => Effect.succeed(withStatus(BAD_REQUEST)({ error: "kind・session・file を送る" })),
    onSome: (params) =>
      committedEnd(fileKeyOf(params)).pipe(
        Effect.map((committed) => json({ committed })),
        Effect.orElseSucceed(storageFailed),
      ),
  });

export { offset, upload };

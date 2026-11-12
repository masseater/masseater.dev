import type {
  ChunkParams,
  ConversationKind,
  ConversationSource,
  FileParams,
} from "@masseater.dev/watashi-protocol";
import { Effect, Option } from "effect";
import type { FileSystem, Path, PlatformError, Schema } from "effect";
import type { HttpClient } from "effect/http";

import { committedOffset, uploadChunk } from "./api.ts";
import type { Upload } from "./api.ts";
import type { Detector } from "./betterleaks.ts";
import { WatashiFailed } from "./errors.ts";
import type { JsonError } from "./errors.ts";
import { gzip } from "./gzip.ts";
import { maskWith } from "./mask.ts";
import { saveOffset, savedOffset } from "./offsets.ts";
import { MAX_CHUNK_BYTES, readChunk } from "./transcript.ts";
import type { Chunk } from "./transcript.ts";

type PushTarget = Readonly<{
  kind: ConversationKind;
  session: string;
  file: string;
  path: string;
  cwd: string;
  source: ConversationSource;
  remoteSession: string;
}>;

type Push = Readonly<{ target: PushTarget; detect: Detector; home: string; maxChunkBytes: number }>;

type PushResult = Readonly<{
  chunks: number;
  bytes: number;
  redactions: number;
  committed: number;
}>;

type PushError = JsonError | WatashiFailed | PlatformError.PlatformError | Schema.SchemaError;

type PushServices = FileSystem.FileSystem | Path.Path | HttpClient.HttpClient;

type Progress = PushResult & Readonly<{ conflicts: number }>;

const MAX_CONFLICTS = 3;
const NONE = 0;
const ONE = 1;

const keyOf = ({ kind, session, file }: PushTarget): FileParams => ({ kind, session, file });

const startOffset = (push: Push): Effect.Effect<number, PushError, PushServices> => {
  const key = keyOf(push.target);
  return savedOffset({ home: push.home, key }).pipe(
    Effect.flatMap(Option.match({ onSome: Effect.succeed, onNone: () => committedOffset(key) })),
  );
};

const paramsOf = (
  target: PushTarget,
  range: Readonly<{ start: number; end: number; redactions: number }>,
): ChunkParams => ({
  ...keyOf(target),
  ...range,
  cwd: target.cwd,
  source: target.source,
  remoteSession: target.remoteSession,
});

const conflicted = (
  push: Push,
  progress: Progress,
  expected: number,
): Effect.Effect<Progress, PushError, PushServices> => {
  if (progress.conflicts >= MAX_CONFLICTS) {
    return Effect.fail(
      WatashiFailed.make({
        reason: "Conflicts",
        message: `送った位置が合わないまま ${push.target.file} を送れなかった`,
      }),
    );
  }
  return saveOffset({ home: push.home, key: keyOf(push.target), offset: expected }).pipe(
    Effect.as({ ...progress, committed: expected, conflicts: progress.conflicts + ONE }),
  );
};

const sendChunk = (
  push: Push,
  chunk: Chunk,
): Effect.Effect<Readonly<{ upload: Upload; redactions: number }>, PushError, PushServices> =>
  Effect.gen(function* send() {
    const masked = yield* maskWith(push.detect)(chunk.text);
    const body = yield* gzip(masked.text);
    const range = { start: chunk.start, end: chunk.end, redactions: masked.redactions };
    const upload = yield* uploadChunk({ params: paramsOf(push.target, range), body });
    return { upload, redactions: masked.redactions };
  });

const advance = (
  push: Push,
  progress: Progress,
  chunk: Chunk,
): Effect.Effect<Progress, PushError, PushServices> =>
  Effect.gen(function* advanceOne() {
    const { upload, redactions } = yield* sendChunk(push, chunk);
    if (upload.status === "conflict") {
      return yield* conflicted(push, progress, upload.expected);
    }
    yield* saveOffset({ home: push.home, key: keyOf(push.target), offset: upload.committed });
    return {
      chunks: progress.chunks + ONE,
      bytes: progress.bytes + chunk.end - chunk.start,
      redactions: progress.redactions + redactions,
      committed: upload.committed,
      conflicts: progress.conflicts,
    };
  });

const step = (
  push: Push,
  progress: Progress,
): Effect.Effect<Option.Option<Progress>, PushError, PushServices> =>
  readChunk({
    path: push.target.path,
    start: progress.committed,
    maxBytes: push.maxChunkBytes,
  }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (chunk) => Effect.asSome(advance(push, progress, chunk)),
      }),
    ),
  );

const loop = (push: Push, progress: Progress): Effect.Effect<Progress, PushError, PushServices> =>
  step(push, progress).pipe(
    Effect.flatMap(
      Option.match({ onNone: () => Effect.succeed(progress), onSome: (next) => loop(push, next) }),
    ),
  );

const pushFile = (
  push: Readonly<{ target: PushTarget; detect: Detector; home: string; maxChunkBytes?: number }>,
): Effect.Effect<PushResult, PushError, PushServices> => {
  const resolved: Push = { ...push, maxChunkBytes: push.maxChunkBytes ?? MAX_CHUNK_BYTES };
  return startOffset(resolved).pipe(
    Effect.flatMap((committed) =>
      loop(resolved, { chunks: NONE, bytes: NONE, redactions: NONE, committed, conflicts: NONE }),
    ),
    Effect.map(({ chunks, bytes, redactions, committed }) => ({
      chunks,
      bytes,
      redactions,
      committed,
    })),
  );
};

/** @internal */
export { pushFile };
/** @internal */
export type { PushError, PushResult, PushServices, PushTarget };

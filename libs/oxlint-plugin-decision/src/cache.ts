import { Effect, FileSystem, Option, Path, Schema } from "effect";
import { Digest } from "effect/crypto";

import { AnswerSchema } from "./answer.ts";
import { parseVerdicts } from "./request.ts";
import type { DecisionRequest, DecisionResponse } from "./types.ts";

const CACHE_VERSION = 7;
const CACHE_DIR = ["node_modules", ".cache", "oxlint-plugin-decision"] as const;

const cacheFile = Effect.fn("cacheFile")(function* cacheFile(
  endpoint: string,
  request: DecisionRequest,
) {
  const digest = yield* Digest.Digest;
  const path = yield* Path.Path;
  const payload = new TextEncoder().encode(
    JSON.stringify({ version: CACHE_VERSION, endpoint, request }),
  );
  const hash = yield* digest.digestHex(Digest.sha256, payload);
  return path.resolve(...CACHE_DIR, `${hash}.json`);
});

const CachedResponse = Schema.Struct({
  model: Schema.NonEmptyString,
  answers: Schema.Record(Schema.String, AnswerSchema),
});

const decodeCached = Schema.decodeOption(Schema.fromJsonString(CachedResponse));

const isComplete = (response: DecisionResponse, request: DecisionRequest): boolean =>
  Option.liftThrowable(() => parseVerdicts(response, request).complete)().pipe(
    Option.getOrElse(() => false),
  );

const readCache = Effect.fn("readCache")(function* readCache(
  file: string,
  request: DecisionRequest,
) {
  const fs = yield* FileSystem.FileSystem;
  const text = yield* fs.readFileString(file).pipe(Effect.option);
  return text.pipe(
    Option.flatMap((raw): Option.Option<DecisionResponse> => decodeCached(raw)),
    Option.filter((response) => isComplete(response, request)),
  );
});

const writeCache = Effect.fn("writeCache")(function* writeCache(
  file: string,
  response: DecisionResponse,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temp = `${file}.tmp-${String(Date.now())}`;
  yield* fs.makeDirectory(path.dirname(file), { recursive: true });
  yield* fs.writeFileString(temp, JSON.stringify(response));
  yield* fs.rename(temp, file);
});

type CacheServices = Digest.Digest | FileSystem.FileSystem | Path.Path;

export { cacheFile, isComplete, readCache, writeCache };
export type { CacheServices };

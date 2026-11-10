import { Clock, Effect, FileSystem, Option, Path, Schema, Function as Fn } from "effect";
import { Digest } from "effect/crypto";

import { AnswerSchema } from "./answer.ts";
import { parseVerdicts } from "./request.ts";
import type { DecisionRequest, DecisionResponse } from "./types.ts";

const DATA_FIRST_ARITY = 2;

const CACHE_VERSION = 7;
const CACHE_DIR = ["node_modules", ".cache", "oxlint-plugin-decision"] as const;

const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

const cacheFile = Effect.fn("cacheFile")(function* cacheFile(
  endpoint: string,
  request: DecisionRequest,
) {
  const digest = yield* Digest.Digest;
  const path = yield* Path.Path;
  const json = yield* encodeJson({ version: CACHE_VERSION, endpoint, request });
  const payload = new TextEncoder().encode(json);
  const hash = yield* digest.digestHex(Digest.sha256, payload);
  return path.resolve(...CACHE_DIR, `${hash}.json`);
});

const CachedResponse = Schema.Struct({
  model: Schema.NonEmptyString,
  answers: Schema.Record(Schema.String, AnswerSchema),
});

const decodeCached = Schema.decodeOption(Schema.fromJsonString(CachedResponse));

const isComplete: {
  (request: DecisionRequest): (response: DecisionResponse) => boolean;
  (response: DecisionResponse, request: DecisionRequest): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (response: DecisionResponse, request: DecisionRequest): boolean =>
  Option.liftThrowable(() => parseVerdicts(response, request).complete)().pipe(
    Option.getOrElse(() => false),
  ),
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
  const now = yield* Clock.currentTimeMillis;
  const temp = `${file}.tmp-${String(now)}`;
  const json = yield* encodeJson(response);
  yield* fs.makeDirectory(path.dirname(file), { recursive: true });
  yield* fs.writeFileString(temp, json);
  yield* fs.rename(temp, file);
});

type CacheServices = Digest.Digest | FileSystem.FileSystem | Path.Path;

/** @internal */
export { cacheFile, isComplete, readCache, writeCache };
/** @internal */
export type { CacheServices };

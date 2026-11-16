import {
  Array as Arr,
  Clock,
  Effect,
  FileSystem,
  Function as Fn,
  Option,
  Path,
  Record as Rec,
  Schema,
  pipe,
} from "effect";
import { Digest } from "effect/crypto";

import { AnswerSchema, PREFIX, parseVerdicts, snippetRefOf } from "#/entities/decision/index.ts";
import type { Answer, DecisionRequest, DecisionResponse } from "#/entities/decision/index.ts";

const DATA_FIRST_ARITY = 2;

const CACHE_VERSION = 8;
/** @internal */
export const CACHE_DIR = `node_modules/.cache/${PREFIX}`;

const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

const contextOf = (request: DecisionRequest, ref: string): Option.Option<string> =>
  pipe(Option.fromUndefinedOr(request.state.contexts), Option.flatMap(Rec.get(ref)));

const keyOf = (endpoint: string, request: DecisionRequest, id: string): unknown => {
  const ref = snippetRefOf(id);
  return {
    version: CACHE_VERSION,
    endpoint,
    model: request.model,
    snippet: request.state.snippets[ref],
    context: Option.getOrNull(contextOf(request, ref)),
    question: request.questions[id],
  };
};

const cacheFile = Effect.fn("cacheFile")(function* cacheFile(key: unknown) {
  const digest = yield* Digest.Digest;
  const path = yield* Path.Path;
  const json = yield* encodeJson(key);
  const hash = yield* digest.digestHex(Digest.sha256, new TextEncoder().encode(json));
  return path.resolve(CACHE_DIR, `${hash}.json`);
});

const CachedAnswerSchema = Schema.Struct({ model: Schema.NonEmptyString, answer: AnswerSchema });

/** @internal */
export interface CachedAnswer {
  readonly model: string;
  readonly answer: Answer;
}

const decodeCached = Schema.decodeOption(Schema.fromJsonString(CachedAnswerSchema));

/** @internal */
export interface QuestionCache {
  readonly id: string;
  readonly file: string;
  readonly cached: Option.Option<CachedAnswer>;
}

/** @internal */
export const isComplete: {
  (request: DecisionRequest): (response: DecisionResponse) => boolean;
  (response: DecisionResponse, request: DecisionRequest): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (response: DecisionResponse, request: DecisionRequest): boolean =>
  Option.liftThrowable(() => parseVerdicts(response, request).complete)().pipe(
    Option.getOrElse(() => false),
  ),
);

const keptFor =
  (refs: readonly string[]) =>
  <Value>(record: Readonly<Record<string, Value>>): Record<string, Value> =>
    pipe(
      record,
      Rec.filter((_value, ref) => refs.includes(ref)),
    );

/** @internal */
export const missingRequest: {
  (missing: readonly string[]): (request: DecisionRequest) => DecisionRequest;
  (request: DecisionRequest, missing: readonly string[]): DecisionRequest;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (request: DecisionRequest, missing: readonly string[]): DecisionRequest => {
    const refs = pipe(missing, Arr.map(snippetRefOf));
    const kept = keptFor(refs);
    return {
      ...request,
      state: {
        ...request.state,
        snippets: kept(request.state.snippets),
        ...pipe(
          Option.fromUndefinedOr(request.state.contexts),
          Option.match({
            onNone: () => ({}),
            onSome: (contexts) => ({ contexts: kept(contexts) }),
          }),
        ),
      },
      questions: pipe(
        request.questions,
        Rec.filter((_question, id) => missing.includes(id)),
      ),
    };
  },
);

const validFor =
  (request: DecisionRequest, id: string) =>
  ({ model, answer }: CachedAnswer): boolean =>
    isComplete({ model, answers: { [id]: answer } }, pipe(request, missingRequest([id])));

const readOne = Effect.fn("readOne")(function* readOne(
  endpoint: string,
  request: DecisionRequest,
  id: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const file = yield* cacheFile(keyOf(endpoint, request, id));
  const text = yield* fs.readFileString(file).pipe(Effect.option);
  const cached: Option.Option<CachedAnswer> = pipe(
    text,
    Option.flatMap(decodeCached),
    Option.filter(validFor(request, id)),
  );
  return { id, file, cached } satisfies QuestionCache;
});

/** @internal */
export const readCache = Effect.fn("readCache")(function* readCache(
  endpoint: string,
  request: DecisionRequest,
) {
  return yield* Effect.forEach(
    Rec.keys(request.questions),
    (id) => readOne(endpoint, request, id),
    {
      concurrency: "unbounded",
    },
  );
});

/** @internal */
export const cachedAnswers = (
  entries: readonly QuestionCache[],
): Readonly<Record<string, Answer>> =>
  Rec.fromEntries(
    pipe(
      entries,
      Arr.flatMap(({ id, cached }) =>
        pipe(
          cached,
          Option.map(({ answer }) => [id, answer] as const),
          Option.toArray,
        ),
      ),
    ),
  );

/** @internal */
export const writeCache = Effect.fn("writeCache")(function* writeCache(
  file: string,
  cached: CachedAnswer,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const now = yield* Clock.currentTimeMillis;
  const temp = `${file}.tmp-${String(now)}`;
  const json = yield* encodeJson(cached);
  yield* fs.makeDirectory(path.dirname(file), { recursive: true });
  yield* fs.writeFileString(temp, json);
  yield* fs.rename(temp, file);
});

/** @internal */
export type CacheServices = Digest.Digest | FileSystem.FileSystem | Path.Path;

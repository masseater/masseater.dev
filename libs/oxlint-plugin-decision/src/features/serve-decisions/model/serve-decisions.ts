import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Config } from "effect";
import type { HttpClient } from "effect/http";
import { runAsWorker } from "synckit";

import { messageOf } from "#/entities/decision/index.ts";
import type {
  DecideInput,
  DecideResult,
  DecisionRequest,
  DecisionResponse,
  WireRequest,
} from "#/entities/decision/index.ts";

import { cachedAnswers, isComplete, missingRequest, readCache, writeCache } from "./cache.ts";
import type { CacheServices, QuestionCache } from "./cache.ts";
import type { AppServices } from "./openrouter-app.ts";
import { workerServices } from "./services.ts";

/** @internal */
export type Services = AppServices | CacheServices | HttpClient.HttpClient;

type Inputs = Arr.NonEmptyReadonlyArray<DecideInput>;

/** @internal */
export interface Transport {
  readonly endpoint: (env: DecideInput["env"]) => Config.Config<string>;
  readonly wires: (request: DecisionRequest) => Arr.NonEmptyReadonlyArray<WireRequest>;
  readonly combine: (
    request: DecisionRequest,
    responses: Arr.NonEmptyReadonlyArray<DecisionResponse>,
  ) => DecisionResponse;
  readonly send: (
    endpoint: string,
    wire: WireRequest,
    input: Pick<DecideInput, "env">,
  ) => Effect.Effect<DecisionResponse, Config.ConfigError | string, Services>;
}

const ask = Effect.fn("ask")(function* ask(
  transport: Transport,
  endpoint: string,
  { request, timeoutMs, env }: DecideInput,
) {
  const responses = yield* Effect.forEach(
    transport.wires(request),
    (wire) => transport.send(endpoint, wire, { env }),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.timeoutOrElse({
      duration: timeoutMs,
      orElse: () => Effect.fail("timeout"),
    }),
  );
  return transport.combine(request, responses);
});

const store = Effect.fn("store")(function* store(
  entries: readonly QuestionCache[],
  response: DecisionResponse,
) {
  yield* Effect.forEach(
    entries,
    ({ id, file }: QuestionCache) =>
      Option.match(Option.fromUndefinedOr(response.answers[id]), {
        onNone: () => Effect.void,
        onSome: (answer) => writeCache(file, { model: response.model, answer }).pipe(Effect.ignore),
      }),
    { concurrency: "unbounded", discard: true },
  );
});

const servedModel = (entries: readonly QuestionCache[]): Option.Option<string> =>
  pipe(
    entries,
    Arr.findFirst(({ cached }) => cached),
    Option.map(({ model }) => model),
  );

const idsOf = (entries: readonly QuestionCache[]): readonly string[] =>
  pipe(
    entries,
    Arr.map(({ id }) => id),
  );

const askMissing = Effect.fn("askMissing")(function* askMissing(
  transport: Transport,
  { endpoint, entries }: Readonly<{ endpoint: string; entries: readonly QuestionCache[] }>,
  input: DecideInput,
) {
  const missing = pipe(
    entries,
    Arr.filter(({ cached }) => Option.isNone(cached)),
  );
  yield* Effect.annotateCurrentSpan({ askedQuestions: missing.length });
  const request = pipe(input.request, missingRequest(idsOf(missing)));
  const asked = yield* ask(transport, endpoint, { ...input, request });
  const response = { model: asked.model, answers: { ...cachedAnswers(entries), ...asked.answers } };
  if (isComplete(response, input.request)) {
    yield* store(missing, asked);
  }
  return response;
});

const decide = Effect.fn("decide")(function* decide(transport: Transport, input: DecideInput) {
  yield* Effect.annotateCurrentSpan({ model: input.request.model });
  const endpoint = yield* transport.endpoint(input.env);
  const entries = yield* readCache(endpoint, input.request);
  const hit = pipe(
    entries,
    Arr.every(({ cached }) => Option.isSome(cached)),
  );
  yield* Effect.annotateCurrentSpan({ cached: hit });
  if (hit) {
    const model = Option.getOrElse(servedModel(entries), () => input.request.model);
    return { response: { model, answers: cachedAnswers(entries) }, cached: true };
  }
  return { response: yield* askMissing(transport, { endpoint, entries }, input), cached: false };
});

const reasonOf = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }
  return messageOf(error);
};

const decideOne = (
  transport: Transport,
  input: DecideInput,
): Effect.Effect<DecideResult, never, Services> =>
  decide(transport, input).pipe(
    Effect.match({
      onSuccess: ({ response, cached }): DecideResult => ({ ok: true, response, cached }),
      onFailure: (error): DecideResult => ({ ok: false, reason: reasonOf(error) }),
    }),
  );

const decideEach = (
  transport: Transport,
  inputs: Inputs,
): Effect.Effect<Arr.NonEmptyReadonlyArray<DecideResult>> =>
  Effect.all(
    pipe(
      inputs,
      Arr.map((input) => decideOne(transport, input)),
    ),
    { concurrency: "unbounded" },
  ).pipe(Effect.provide(workerServices));

/** @internal */
export const serveDecisions = (transport: Transport): void => {
  runAsWorker((inputs: Inputs): Promise<Arr.NonEmptyReadonlyArray<DecideResult>> =>
    Effect.runPromise(decideEach(transport, inputs)),
  );
};

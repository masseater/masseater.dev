import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Config } from "effect";
import type { HttpClient } from "effect/http";
import { runAsWorker } from "synckit";

import { cacheFile, isComplete, readCache, writeCache } from "./cache.ts";
import type { CacheServices } from "./cache.ts";
import type { AppServices } from "./openrouter-app.ts";
import { messageOf } from "./runtime.ts";
import { workerServices } from "./services.ts";
import type { DecideInput, DecideResult, DecisionRequest, DecisionResponse } from "./types.ts";
import type { WireRequest } from "./wire.ts";

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

const askAndStore = Effect.fn("askAndStore")(function* askAndStore(
  transport: Transport,
  { endpoint, file }: Readonly<{ endpoint: string; file: string }>,
  input: DecideInput,
) {
  const response = yield* ask(transport, endpoint, input);
  if (isComplete(response, input.request)) {
    yield* writeCache(file, response).pipe(Effect.ignore);
  }
  return response;
});

const decide = Effect.fn("decide")(function* decide(transport: Transport, input: DecideInput) {
  yield* Effect.annotateCurrentSpan({ model: input.request.model });
  const endpoint = yield* transport.endpoint(input.env);
  const file = yield* cacheFile(endpoint, input.request);
  const cached = yield* readCache(file, input.request);
  yield* Effect.annotateCurrentSpan({ cached: Option.isSome(cached) });
  if (Option.isSome(cached)) {
    return { response: cached.value, cached: true };
  }
  return { response: yield* askAndStore(transport, { endpoint, file }, input), cached: false };
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

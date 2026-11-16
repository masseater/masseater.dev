import { Duration, Effect, Option, Schedule, Schema } from "effect";

import { Completion } from "#/entities/completion/model/completion.ts";
import { down } from "#/entities/completion/model/model-down.ts";
import type { ModelDown } from "#/entities/completion/model/model-down.ts";
import { STOP } from "#/entities/completion/model/prompt.ts";
import {
  MODEL_IDLE,
  MODEL_IMAGE,
  MODEL_INSTANCE,
  MODEL_PORT,
  MODEL_STARTUP,
} from "#/shared/config/index.ts";

export type Asked = Readonly<{ prompt: string; maxTokens: number }>;

const MODEL_ORIGIN = "http://model";
const OK = 200;
export const TEMPERATURE = 0;

const STARTUP = {
  schedule: Schedule.spaced(MODEL_STARTUP.spacing),
  times: MODEL_STARTUP.probes,
} as const;

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const decodeCompletion = Schema.decodeUnknownEffect(Completion);

export const containerOf = (ctx: DurableObjectState): Effect.Effect<Container, ModelDown> =>
  Effect.fromOption(Option.fromUndefinedOr(ctx.container), () =>
    down("the durable object has no container"),
  );

const boot = Effect.fn("plamo.boot")(function* boot(container: Container) {
  if (container.running) {
    return;
  }
  const image = yield* Effect.fromOption(
    Option.fromUndefinedOr(container.images[MODEL_IMAGE]),
    () => down(`image ${MODEL_IMAGE} is not bound`),
  );
  yield* Effect.try({
    try: () => {
      container.start({ image, enableInternet: false, instance: MODEL_INSTANCE });
    },
    catch: down,
  });
  yield* Effect.tryPromise({
    try: () => container.setInactivityTimeout(Duration.toMillis(MODEL_IDLE)),
    catch: down,
  });
});

const ready = (container: Container): Effect.Effect<void, ModelDown> =>
  Effect.tryPromise({
    try: () => container.getTcpPort(MODEL_PORT).fetch(`${MODEL_ORIGIN}/health`),
    catch: down,
  }).pipe(
    Effect.filterOrFail(
      (response) => response.status === OK,
      (response) => down(`llama-server answered ${String(response.status)} on /health`),
    ),
    Effect.retry(STARTUP),
    Effect.asVoid,
  );

export const complete = Effect.fn("plamo.complete")(function* complete(
  container: Container,
  { prompt, maxTokens }: Asked,
) {
  yield* boot(container);
  yield* ready(container);
  const body = yield* encodeJson({
    prompt,
    n_predict: maxTokens,
    temperature: TEMPERATURE,
    stop: STOP,
    stream: false,
    cache_prompt: true,
  }).pipe(Effect.mapError(down));
  const response = yield* Effect.tryPromise({
    try: () =>
      container.getTcpPort(MODEL_PORT).fetch(`${MODEL_ORIGIN}/completion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    catch: down,
  });
  const answer = yield* Effect.tryPromise({ try: () => response.json(), catch: down });
  return yield* decodeCompletion(answer).pipe(Effect.mapError(down));
});

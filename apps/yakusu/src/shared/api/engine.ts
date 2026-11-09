import { Channel, invoke } from "@tauri-apps/api/core";
import { Effect, Option, Predicate, Queue, Schema, Stream, pipe } from "effect";

type Form = "plain" | "polite";

type TranslateRequest = Readonly<{
  text: string;
  source: Option.Option<string>;
  target: string;
  form: Option.Option<Form>;
}>;

type Engine = Readonly<{ translate: (request: TranslateRequest) => AsyncIterable<string> }>;

const taggedError = Schema.TaggedError;

class EngineError extends taggedError<EngineError, { readonly brand: unique symbol }>()(
  "EngineError",
  { message: Schema.String },
) {}

const UNTRANSLATABLE = "翻訳できませんでした";

const engineError = (cause: unknown): EngineError =>
  EngineError.make({
    message: pipe(
      Option.liftPredicate(cause, Predicate.isString),
      Option.getOrElse(() => UNTRANSLATABLE),
    ),
  });

const tauriEngine: Engine = {
  translate: (request) =>
    Stream.toAsyncIterable(
      Stream.callback<string, EngineError>((queue) =>
        Effect.tryPromise({
          try: () =>
            invoke("translate", {
              request: {
                text: request.text,
                source: Option.getOrUndefined(request.source),
                target: request.target,
                form: Option.getOrUndefined(request.form),
              },
              onDelta: new Channel<string>((delta) => {
                Queue.offerUnsafe(queue, delta);
              }),
            }),
          catch: engineError,
        }).pipe(Effect.andThen(Queue.end(queue))),
      ),
    ),
};

export { tauriEngine };
export type { Engine, Form, TranslateRequest };

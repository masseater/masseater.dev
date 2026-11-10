import { Channel, invoke } from "@tauri-apps/api/core";
import { Effect, Option, Predicate, Queue, Schema, Stream, pipe } from "effect";

type Form = "plain" | "polite";

type TranslateRequest = Readonly<{
  text: string;
  source: Option.Option<string>;
  target: string;
  form: Option.Option<Form>;
}>;

type Progress = Readonly<{ received: number; total: number }>;

type Engine = Readonly<{
  prepare: () => AsyncIterable<Progress>;
  translate: (request: TranslateRequest) => AsyncIterable<string>;
}>;

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

const invokeStream = <Item>(
  command: string,
  channel: string,
  rest: Readonly<Record<string, unknown>>,
): AsyncIterable<Item> =>
  Stream.toAsyncIterable(
    Stream.callback<Item, EngineError>((queue) =>
      Effect.tryPromise({
        try: () =>
          invoke(command, {
            ...rest,
            [channel]: new Channel<Item>((item) => {
              Queue.offerUnsafe(queue, item);
            }),
          }),
        catch: engineError,
      }).pipe(Effect.andThen(Queue.end(queue))),
    ),
  );

const tauriEngine: Engine = {
  prepare: () => invokeStream<Progress>("prepare", "onProgress", {}),
  translate: (request) =>
    invokeStream<string>("translate", "onDelta", {
      request: {
        text: request.text,
        source: Option.getOrUndefined(request.source),
        target: request.target,
        form: Option.getOrUndefined(request.form),
      },
    }),
};

export { tauriEngine };
export type { Engine, Form, Progress, TranslateRequest };

import { Array, Effect, Option, Predicate, Schedule, Schema, pipe } from "effect";

const PROVIDER = "cloudflare.workers_ai";
const OUT_OF_CAPACITY = "3040";
const ERROR_CODE = /(?<!\d)(?<code>\d{4}): /u;
const RETRY_TIMES = 4;
const RETRY_BASE = "2 seconds";
const COMPLETE_REASONS: ReadonlySet<string> = new Set(["stop", "tool_calls"]);
const EXCEPTION_EVENTS = {
  chat: "gen_ai.client.inference.exception",
  embeddings: "gen_ai.client.embeddings.exception",
} as const;

type Operation = keyof typeof EXCEPTION_EVENTS;

const taggedError = Schema.TaggedError;

class WorkersAiError extends taggedError<WorkersAiError, { readonly brand: unique symbol }>()(
  "WorkersAiError",
  {
    errorType: Schema.String,
    outOfCapacity: Schema.Boolean,
    cause: Schema.Unknown,
  },
) {}

const ApiErrors = Schema.Struct({
  errors: Schema.NonEmptyArray(Schema.Struct({ code: Schema.Finite })),
});

const Choice = Schema.Struct({ finish_reason: Schema.String });
const Tokens = Schema.optional(Schema.Finite);
const Usage = Schema.Struct({ prompt_tokens: Tokens, completion_tokens: Tokens });
const Answer = Schema.Struct({
  choices: Schema.optional(Schema.Array(Choice)),
  usage: Schema.optional(Usage),
});

const decodeApiErrors = Schema.decodeUnknownOption(ApiErrors);
const decodeAnswer = Schema.decodeUnknownOption(Answer);

const messageCode = ({ message }: Readonly<Pick<Error, "message">>): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ERROR_CODE.exec(message)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(({ code }) => Option.fromNullishOr(code)),
  );

const errorTypeOf = (cause: unknown): string =>
  pipe(
    decodeApiErrors(cause),
    Option.map(({ errors: [{ code }] }) => `${code}`),
    Option.orElse(() =>
      pipe(Option.liftPredicate(cause, Predicate.isError), Option.flatMap(messageCode)),
    ),
    Option.orElse(() =>
      pipe(
        Option.liftPredicate(cause, Predicate.isError),
        Option.map(({ name }) => name),
      ),
    ),
    Option.getOrElse(() => "_OTHER"),
  );

const exceptionOf = (cause: unknown): Readonly<Record<string, string>> =>
  pipe(
    Option.liftPredicate(cause, Predicate.isError),
    Option.match({
      onNone: () => ({}),
      onSome: ({ name, message }) => ({ "exception.type": name, "exception.message": message }),
    }),
  );

type Attributes = Readonly<Record<string, unknown>>;

const attribute = <Value>(key: string, value: Option.Option<Value>): Attributes =>
  pipe(value, Option.match({ onNone: () => ({}), onSome: (present) => ({ [key]: present }) }));

const finishReasons = ({ choices }: typeof Answer.Type): Option.Option<readonly string[]> =>
  pipe(
    Option.fromUndefinedOr(choices),
    Option.map(Array.map(({ finish_reason }) => finish_reason)),
  );

const usageOf = ({ usage }: typeof Answer.Type): Option.Option<typeof Usage.Type> =>
  Option.fromUndefinedOr(usage);

const answerAttributes = (answer: typeof Answer.Type): Attributes => ({
  ...attribute("gen_ai.response.finish_reasons", finishReasons(answer)),
  ...attribute(
    "gen_ai.usage.input_tokens",
    pipe(
      usageOf(answer),
      Option.flatMap(({ prompt_tokens }) => Option.fromUndefinedOr(prompt_tokens)),
    ),
  ),
  ...attribute(
    "gen_ai.usage.output_tokens",
    pipe(
      usageOf(answer),
      Option.flatMap(({ completion_tokens }) => Option.fromUndefinedOr(completion_tokens)),
    ),
  ),
});

const isCutOff = (answer: typeof Answer.Type): boolean =>
  pipe(finishReasons(answer), Option.exists(Array.some((reason) => !COMPLETE_REASONS.has(reason))));

interface WorkersAiCall<Output> {
  readonly operation: Operation;
  readonly model: string;
  readonly prompt?: string;
  readonly call: () => PromiseLike<Output>;
}

const requestAttributes = ({
  operation,
  model,
  prompt,
}: Readonly<Pick<WorkersAiCall<unknown>, "model" | "operation" | "prompt">>): Attributes => ({
  "gen_ai.operation.name": operation,
  "gen_ai.provider.name": PROVIDER,
  "gen_ai.request.model": model,
  ...attribute("gen_ai.prompt.name", Option.fromUndefinedOr(prompt)),
});

const runWorkersAi = <Output>({
  call,
  ...request
}: WorkersAiCall<Output>): Effect.Effect<Output, WorkersAiError> => {
  const attributes = requestAttributes(request);
  return Effect.tryPromise({
    try: () => Promise.resolve(call()),
    catch: (cause) => {
      const errorType = errorTypeOf(cause);
      return WorkersAiError.make({
        errorType,
        outOfCapacity: errorType === OUT_OF_CAPACITY,
        cause,
      });
    },
  }).pipe(
    Effect.tapError(({ errorType, cause }) =>
      Effect.logWarning(EXCEPTION_EVENTS[request.operation]).pipe(
        Effect.annotateLogs({ ...attributes, ...exceptionOf(cause), "error.type": errorType }),
      ),
    ),
    Effect.retry({
      schedule: Schedule.exponential(RETRY_BASE),
      times: RETRY_TIMES,
      while: ({ outOfCapacity }) => outOfCapacity,
    }),
    Effect.tapError(({ errorType }) => Effect.annotateCurrentSpan("error.type", errorType)),
    Effect.tap((output) =>
      pipe(
        decodeAnswer(output),
        Option.match({
          onNone: () => Effect.void,
          onSome: (answer) => {
            const answered = answerAttributes(answer);
            const recorded = Effect.annotateCurrentSpan(answered);
            if (!isCutOff(answer)) {
              return recorded;
            }
            return recorded.pipe(
              Effect.andThen(Effect.logWarning("Workers AI cut the answer off")),
              Effect.annotateLogs({ ...attributes, ...answered }),
            );
          },
        }),
      ),
    ),
    Effect.withSpan(`${request.operation} ${request.model}`, { kind: "client", attributes }),
  );
};

export type { Operation, WorkersAiCall };
export { runWorkersAi, WorkersAiError };

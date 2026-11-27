import { Array, Effect, Option, Predicate, Schedule, Schema, pipe } from "effect";

const PROVIDER = "cloudflare.workers_ai";
const DEFAULT_GATEWAY = "default";
const OUT_OF_CAPACITY = "3040";
const ERROR_CODE = /(?<!\d)(?<code>\d{4}): /u;
const RETRY_TIMES = 4;
const RETRY_BASE = "2 seconds";
const COMPLETE_REASONS: ReadonlySet<string> = new Set(["stop", "tool_calls"]);
const EXCEPTION_EVENTS = {
  chat: "gen_ai.client.inference.exception",
  embeddings: "gen_ai.client.embeddings.exception",
  decision: "gen_ai.client.decision.exception",
} as const;

export type Operation = keyof typeof EXCEPTION_EVENTS;

const taggedError = Schema.TaggedError;

export class WorkersAiError extends taggedError<
  WorkersAiError,
  { readonly brand: unique symbol }
>()("WorkersAiError", {
  errorType: Schema.String,
  outOfCapacity: Schema.Boolean,
  cause: Schema.Unknown,
}) {}

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

export type GatewayMetadata = Readonly<Record<string, string>>;

export interface GatewayOptions {
  readonly gateway: Readonly<{ id: string; metadata: GatewayMetadata }>;
}

export interface WorkersAiCall<Output> {
  readonly operation: Operation;
  readonly model: string;
  readonly caller: string;
  readonly gateway?: string;
  readonly prompt?: string;
  readonly call: (options: GatewayOptions) => PromiseLike<Output>;
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

const traceIdOf: Effect.Effect<GatewayMetadata> = Effect.currentSpan.pipe(
  Effect.map(({ traceId }) => ({ trace_id: traceId })),
  Effect.orElseSucceed(() => ({})),
);

const gatewayOptions = (caller: string, gateway: string): Effect.Effect<GatewayOptions> =>
  traceIdOf.pipe(
    Effect.map((trace) => ({ gateway: { id: gateway, metadata: { caller, ...trace } } })),
  );

const recordAnswer =
  (attributes: Attributes) =>
  (output: unknown): Effect.Effect<void> =>
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
    );

export const runWorkersAi = <Output>({
  call,
  caller,
  gateway = DEFAULT_GATEWAY,
  ...request
}: WorkersAiCall<Output>): Effect.Effect<Output, WorkersAiError> => {
  const attributes = requestAttributes(request);
  return gatewayOptions(caller, gateway).pipe(
    Effect.flatMap((options) =>
      Effect.tryPromise({
        try: () => Promise.resolve(call(options)),
        catch: (cause) => {
          const errorType = errorTypeOf(cause);
          return WorkersAiError.make({
            errorType,
            outOfCapacity: errorType === OUT_OF_CAPACITY,
            cause,
          });
        },
      }),
    ),
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
    Effect.tap(recordAnswer(attributes)),
    Effect.withSpan(`${request.operation} ${request.model}`, { kind: "client", attributes }),
  );
};

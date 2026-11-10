import { Array, Effect, Option, Predicate, Schedule, Schema, pipe } from "effect";

const OUT_OF_CAPACITY = 3040;
const OUT_OF_CAPACITY_MESSAGE = /(?<!\d)3040: /u;
const RETRY_TIMES = 4;
const RETRY_BASE = "2 seconds";
const COMPLETE_REASONS: ReadonlySet<string> = new Set(["stop", "tool_calls"]);

const taggedError = Schema.TaggedError;

class WorkersAiError extends taggedError<WorkersAiError, { readonly brand: unique symbol }>()(
  "WorkersAiError",
  {
    label: Schema.String,
    outOfCapacity: Schema.Boolean,
    cause: Schema.Unknown,
  },
) {}

const ApiErrors = Schema.Struct({
  errors: Schema.Array(Schema.Struct({ code: Schema.Finite })),
});

const Answer = Schema.Struct({
  choices: Schema.Array(Schema.Struct({ finish_reason: Schema.String })),
  usage: Schema.optional(Schema.Struct({ completion_tokens: Schema.Finite })),
});

const decodeApiErrors = Schema.decodeUnknownOption(ApiErrors);
const decodeAnswer = Schema.decodeUnknownOption(Answer);

const isOutOfCapacity = (cause: unknown): boolean =>
  pipe(
    decodeApiErrors(cause),
    Option.exists(({ errors }) =>
      pipe(
        errors,
        Array.some(({ code }) => code === OUT_OF_CAPACITY),
      ),
    ),
  ) ||
  pipe(
    Option.liftPredicate(cause, Predicate.isError),
    Option.exists(({ message }) => OUT_OF_CAPACITY_MESSAGE.test(message)),
  );

interface CutOff {
  readonly finishReason: string;
  readonly outputTokens: Option.Option<number>;
}

const cutOffOf = (output: unknown): Option.Option<CutOff> =>
  pipe(
    decodeAnswer(output),
    Option.flatMap(({ choices, usage }) =>
      pipe(
        choices,
        Array.findFirst(({ finish_reason }) => !COMPLETE_REASONS.has(finish_reason)),
        Option.map(({ finish_reason }) => ({
          finishReason: finish_reason,
          outputTokens: pipe(
            Option.fromUndefinedOr(usage),
            Option.map(({ completion_tokens }) => completion_tokens),
          ),
        })),
      ),
    ),
  );

const recordCutOff =
  (label: string) =>
  (output: unknown): Effect.Effect<void> =>
    pipe(
      cutOffOf(output),
      Option.match({
        onNone: () => Effect.void,
        onSome: ({ finishReason, outputTokens }) =>
          Effect.logWarning("Workers AI cut the answer off").pipe(
            Effect.annotateLogs({
              label,
              finishReason,
              outputTokens: Option.getOrNull(outputTokens),
            }),
          ),
      }),
    );

interface WorkersAiCall<Output> {
  readonly label: string;
  readonly call: () => PromiseLike<Output>;
}

const runWorkersAi = <Output>({
  label,
  call,
}: WorkersAiCall<Output>): Effect.Effect<Output, WorkersAiError> =>
  Effect.tryPromise({
    try: () => Promise.resolve(call()),
    catch: (cause) => WorkersAiError.make({ label, outOfCapacity: isOutOfCapacity(cause), cause }),
  }).pipe(
    Effect.tapError(({ outOfCapacity }) => {
      if (!outOfCapacity) {
        return Effect.void;
      }
      return Effect.logWarning("Workers AI is out of capacity").pipe(
        Effect.annotateLogs({ label }),
      );
    }),
    Effect.retry({
      schedule: Schedule.exponential(RETRY_BASE),
      times: RETRY_TIMES,
      while: ({ outOfCapacity }) => outOfCapacity,
    }),
    Effect.tap(recordCutOff(label)),
  );

export type { WorkersAiCall };
export { runWorkersAi, WorkersAiError };

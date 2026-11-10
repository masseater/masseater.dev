import type { Span } from "@cloudflare/workers-types/index.ts";
import { Array, Cause, Effect, Inspectable, Option, Predicate, Schema, pipe } from "effect";

import { failures, isServerError, responseStatus } from "./failure.ts";

const taggedError = Schema.TaggedError;

class HandlerFailed extends taggedError<HandlerFailed, { readonly brand: unique symbol }>()(
  "HandlerFailed",
  { cause: Schema.Unknown },
) {}

type Exception = Readonly<Pick<Error, "name" | "message" | "stack">>;

const requestSpans = new WeakMap<Request, Span>();

const exceptionOf = (error: unknown): Exception =>
  pipe(
    Option.liftPredicate(error, Predicate.isError),
    Option.match({
      onNone: () => ({ name: "Error", message: Inspectable.toStringUnknown(error) }),
      onSome: ({ name, message, stack }) =>
        pipe(
          Option.fromUndefinedOr(stack),
          Option.match({
            onNone: () => ({ name, message }),
            onSome: (trace) => ({ name, message, stack: trace }),
          }),
        ),
    }),
  );

const markFailed =
  (error: unknown) =>
  (span: Span): void => {
    const exception = exceptionOf(error);
    span.setStatus({ code: "error", message: exception.message });
    span.setAttribute("error.type", exception.name);
    span.recordException(exception);
  };

const markCause =
  (cause: Cause.Cause<unknown>) =>
  (span: Span): void => {
    const error = pipe(
      failures(cause),
      Option.flatMap((failed) => Array.head(Cause.prettyErrors(failed))),
    );
    if (Option.isSome(error)) {
      markFailed(error.value)(span);
    }
  };

const recordStatus =
  (status: number) =>
  (span: Span): void => {
    span.setAttribute("http.response.status_code", status);
    if (isServerError(status)) {
      span.setStatus({ code: "error" });
      span.setAttribute("error.type", `${status}`);
    }
  };

const markThrown =
  (thrown: unknown) =>
  (span: Span): void => {
    pipe(
      responseStatus(thrown),
      Option.match({ onNone: () => markFailed(thrown), onSome: recordStatus }),
    )(span);
  };

const traced =
  <Result>(observe: (result: Result) => (span: Span) => void) =>
  (run: () => PromiseLike<Result> | Result) =>
  (span: Span): Promise<Result> =>
    Effect.runPromise(
      Effect.tryPromise({
        try: () => Promise.resolve(run()),
        catch: (cause) => HandlerFailed.make({ cause }),
      }).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            observe(result)(span);
          }),
        ),
        Effect.tapError(({ cause }) =>
          Effect.sync(() => {
            markThrown(cause)(span);
          }),
        ),
        Effect.catchTag("HandlerFailed", ({ cause }) => Effect.die(cause)),
      ),
    );

export { markCause, markFailed, recordStatus, requestSpans, traced };

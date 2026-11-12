import { Cause, Effect, Schema } from "effect";

const taggedError = Schema.TaggedError;

class RequestFailed extends taggedError<RequestFailed, { readonly brand: unique symbol }>()(
  "RequestFailed",
  {
    reason: Schema.Literals(["NotFound", "Invalid", "Failed"]),
    message: Schema.String,
  },
  { identifier: "RequestFailed" },
) {}

const isRequestFailed = Schema.is(RequestFailed);

const asRequestFailed = (problem: unknown): RequestFailed => {
  if (isRequestFailed(problem)) {
    return problem;
  }
  return RequestFailed.make({ reason: "Failed", message: Cause.pretty(Cause.fail(problem)) });
};

const failed = <Value, Failure, Requirements>(
  effect: Effect.Effect<Value, Failure, Requirements>,
): Effect.Effect<Value, RequestFailed, Requirements> =>
  effect.pipe(
    Effect.tapError((problem) => Effect.logError("request failed", problem)),
    Effect.mapError(asRequestFailed),
  );

export { RequestFailed, asRequestFailed, failed };

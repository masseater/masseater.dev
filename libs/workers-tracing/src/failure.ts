import { Array, Cause, Function, Option, Predicate, pipe } from "effect";

const NOT_FOUND = 404;
const SERVER_ERROR = 500;

const isNotFound = (thrown: unknown): boolean =>
  Predicate.hasProperty(thrown, "isNotFound") && thrown.isNotFound === true;

const responseStatus = (thrown: unknown): Option.Option<number> => {
  if (thrown instanceof Response) {
    return Option.some(thrown.status);
  }
  if (isNotFound(thrown)) {
    return Option.some(NOT_FOUND);
  }
  return Option.none();
};

const isServerError = (status: number): boolean => status >= SERVER_ERROR;

const isFailure = (thrown: unknown): boolean =>
  pipe(responseStatus(thrown), Option.match({ onNone: Function.constTrue, onSome: isServerError }));

const failures = (cause: Cause.Cause<unknown>): Option.Option<Cause.Cause<unknown>> =>
  pipe(
    cause.reasons,
    Array.filter(
      (reason) =>
        (Cause.isFailReason(reason) && isFailure(reason.error)) ||
        (Cause.isDieReason(reason) && isFailure(reason.defect)),
    ),
    Option.liftPredicate(Array.isReadonlyArrayNonEmpty),
    Option.map(Cause.fromReasons),
  );

export { failures, isServerError, responseStatus };

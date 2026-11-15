import { Option, Predicate, String as Str, pipe } from "effect";

const MONTH_START = 5;

export const monthLabel = (month: unknown): string =>
  pipe(
    Option.liftPredicate(month, Predicate.isString),
    Option.map((text) => `${String(Number(Str.slice(MONTH_START)(text)))}月`),
    Option.getOrElse(() => ""),
  );

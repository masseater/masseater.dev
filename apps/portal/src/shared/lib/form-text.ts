import { Option, Predicate, pipe } from "effect";
import type { SubmitEvent } from "react";

const formText =
  (event: SubmitEvent<HTMLFormElement>) =>
  (name: string): string =>
    pipe(
      Option.fromNullishOr(new FormData(event.currentTarget).get(name)),
      Option.filter(Predicate.isString),
      Option.getOrElse(() => ""),
    );

export { formText };

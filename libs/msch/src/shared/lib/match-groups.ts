import { Option, pipe } from "effect";

export const groupOf =
  (name: string) =>
  (found: RegExpMatchArray | null): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(found),
      Option.flatMap((match) => Option.fromNullishOr(match.groups)),
      Option.flatMap((groups) => Option.fromNullishOr(groups[name])),
    );

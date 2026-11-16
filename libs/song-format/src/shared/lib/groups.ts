import { Option, String as Str, pipe } from "effect";

export const groupsOf =
  (pattern: RegExp) =>
  (text: string): Option.Option<Partial<Record<string, string>>> =>
    pipe(
      text,
      Str.match(pattern),
      Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    );

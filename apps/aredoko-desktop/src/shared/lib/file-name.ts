import { Array, Option, String, pipe } from "effect";

export const fileNameOf = (pathname: string): string =>
  pipe(
    pathname,
    String.split(/[\\/]/u),
    Array.last,
    Option.getOrElse(() => pathname),
  );

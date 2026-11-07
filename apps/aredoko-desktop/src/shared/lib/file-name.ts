import { Array, Option, String, pipe } from "effect";

const fileNameOf = (pathname: string): string =>
  pipe(
    pathname,
    String.split(/[\\/]/u),
    Array.last,
    Option.getOrElse(() => pathname),
  );

export { fileNameOf };

import { Array, Option, String, pipe } from "effect";

const SEPARATOR = /[\\/]/u;

export const pathPartsOf = (path: string): readonly string[] => pipe(path, String.split(SEPARATOR));

export const fileNameOf = (path: string): string =>
  pipe(
    pathPartsOf(path),
    Array.last,
    Option.getOrElse(() => path),
  );

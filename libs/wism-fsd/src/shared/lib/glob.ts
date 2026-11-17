import { Array as Arr, pipe } from "effect";
import { Minimatch } from "minimatch";

export type Matcher = (path: string) => boolean;

export const matcher = (patterns: readonly string[]): Matcher => {
  const compiled = pipe(
    patterns,
    Arr.map((pattern) => new Minimatch(pattern, { dot: true })),
  );
  return (path) =>
    pipe(
      compiled,
      Arr.some((glob) => glob.match(path)),
    );
};

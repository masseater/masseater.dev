import { Array as Arr, String as Str, pipe } from "effect";
import { dual } from "effect/Function";

const ARITY = 2;
const RUN_AND_ATTEMPT = /-\d{6,}(?:-\d+)?/gu;

export const sameRun = ({ key }: Readonly<{ key: string }>): string =>
  Str.replaceAll(RUN_AND_ATTEMPT, "")(key);

export const sameKind = (): string => "";

export const staleOf: {
  <Entry>(group: (entry: Entry) => string): (newestFirst: readonly Entry[]) => readonly Entry[];
  <Entry>(newestFirst: readonly Entry[], group: (entry: Entry) => string): readonly Entry[];
} = dual(
  ARITY,
  <Entry>(newestFirst: readonly Entry[], group: (entry: Entry) => string): readonly Entry[] =>
    pipe(
      newestFirst,
      Arr.filter((entry, index) =>
        pipe(
          newestFirst,
          Arr.take(index),
          Arr.some((newer) => group(newer) === group(entry)),
        ),
      ),
    ),
);

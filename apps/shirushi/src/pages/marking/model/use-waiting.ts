import { Array as Arr, Predicate, pipe } from "effect";

import { usePairs, useStatements } from "#/entities/taste/index.ts";

export type Waiting = Readonly<{ pairs: number; statements: number }>;

export const useWaiting = (): Waiting => ({
  pairs: pipe(
    usePairs(),
    Arr.filter(({ choice }) => Predicate.isNull(choice)),
    Arr.length,
  ),
  statements: pipe(
    useStatements(),
    Arr.filter(({ judgement }) => Predicate.isNull(judgement)),
    Arr.length,
  ),
});

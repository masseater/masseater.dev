import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Problem } from "./problem.ts";

const START = 0;
const FIRST_COLUMN = 1;

const positionOf =
  (source: string) =>
  (index: number): Pick<Problem, "line" | "column"> => {
    const before = pipe(source, Str.slice(START, index), Str.split("\n"));
    return {
      line: before.length,
      column: pipe(
        Arr.last(before),
        Option.match({ onNone: () => FIRST_COLUMN, onSome: (last) => last.length + FIRST_COLUMN }),
      ),
    };
  };

export { positionOf };

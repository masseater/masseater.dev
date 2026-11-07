import { Array as Arr, pipe } from "effect";

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

interface Fragment {
  readonly text: string;
  readonly confidence: number;
  readonly box: Box;
}

interface Field {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

type FieldValue = Readonly<{ status: "found"; text: string }> | Readonly<{ status: "missing" }>;

interface Extraction {
  readonly values: Readonly<Record<string, FieldValue>>;
  readonly costUsd: number;
}

const MISSING: FieldValue = { status: "missing" };

const stateOf = (fragments: readonly Fragment[]): string =>
  pipe(
    fragments,
    Arr.map(({ text }) => text),
    Arr.join("\n"),
  );

export { MISSING, stateOf };
export type { Box, Extraction, Field, FieldValue, Fragment };

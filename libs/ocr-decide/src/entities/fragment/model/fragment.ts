import { Array as Arr, pipe } from "effect";
import type { Bbox } from "tesseract.js";

export type Box = Readonly<Bbox>;

export interface Fragment {
  readonly text: string;
  readonly confidence: number;
  readonly box: Box;
}

export interface Field {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export type FieldValue =
  | Readonly<{ status: "found"; text: string }>
  | Readonly<{ status: "missing" }>;

export interface Extraction {
  readonly values: Readonly<Record<string, FieldValue>>;
  readonly costUsd: number;
}

export const MISSING: FieldValue = { status: "missing" };

export const stateOf = (fragments: readonly Fragment[]): string =>
  pipe(
    fragments,
    Arr.map(({ text }) => text),
    Arr.join("\n"),
  );

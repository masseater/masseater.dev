import { INVOICE_FIELDS } from "@masseater.dev/ocr-decide";
import type { FieldValue } from "@masseater.dev/ocr-decide";
import { Option, Array as Arr, pipe } from "effect";

import { COPY } from "#/shared/config";

const COST_DIGITS = 5;

const SECOND_DIGITS = 1;

export interface Line {
  readonly label: string;
  readonly value: string;
}

const textOf = (value: FieldValue | undefined): string => {
  const found = Option.fromNullishOr(value);
  if (Option.isSome(found) && found.value.status === "found") {
    return found.value.text;
  }
  return COPY.missing;
};

export const linesOf = (
  result: Readonly<{
    values: Readonly<Record<string, FieldValue>>;
    costUsd: number;
    seconds: number;
  }>,
): readonly Line[] => [
  ...pipe(
    INVOICE_FIELDS,
    Arr.map(({ id, label }) => ({ label, value: textOf(result.values[id]) })),
  ),
  { label: COPY.seconds, value: `${result.seconds.toFixed(SECOND_DIGITS)} 秒` },
  { label: COPY.cost, value: `$${result.costUsd.toFixed(COST_DIGITS)}` },
];

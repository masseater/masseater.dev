import { METHODS } from "@r_masseater/ocr-decide";
import type { FieldValue } from "@r_masseater/ocr-decide";
import { Schema } from "effect";

import { labelOf } from "./outcome.ts";
import type { Outcome } from "./outcome.ts";

const FieldValueSchema = Schema.Union([
  Schema.Struct({ status: Schema.Literal("found"), text: Schema.String }),
  Schema.Struct({ status: Schema.Literal("missing") }),
]);

const ValuesSchema = Schema.Union([
  Schema.Record(Schema.String, FieldValueSchema),
  Schema.Struct({ failed: Schema.String }),
]);

const DetailSchema = Schema.Struct({
  id: Schema.String,
  method: Schema.Literals(METHODS),
  model: Schema.String,
  seconds: Schema.Finite,
  costUsd: Schema.Finite,
  values: ValuesSchema,
});

const DetailsSchema = Schema.fromJsonString(Schema.Array(DetailSchema), { space: 2 });

type Detail = typeof DetailSchema.Type;

const isFailure = (values: Detail["values"]): values is Readonly<{ failed: string }> =>
  "failed" in values && typeof values.failed === "string";

const detailOf = (outcome: Outcome): Detail => {
  const { id, method, model, seconds, costUsd, extraction } = outcome;
  if (extraction.status === "failed") {
    return { id, method, model, seconds, costUsd, values: { failed: extraction.reason } };
  }
  return { id, method, model, seconds, costUsd, values: extraction.value.values };
};

const outcomeOf = (detail: Detail): Outcome => {
  const { values, ...rest } = detail;
  const base = { ...rest, label: labelOf(rest.model) };
  if (isFailure(values)) {
    return { ...base, extraction: { status: "failed", reason: values.failed } };
  }
  const read: Readonly<Record<string, FieldValue>> = values;
  return {
    ...base,
    extraction: { status: "done", value: { values: read, costUsd: rest.costUsd } },
  };
};

export { DetailsSchema, detailOf, outcomeOf };
export type { Detail };

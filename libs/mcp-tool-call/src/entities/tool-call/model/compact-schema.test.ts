import { expect, it } from "@effect/vitest";
import { Schema, pipe } from "effect";

import { compactInput, compactJsonSchema } from "./compact-schema.ts";

const TARGET = { target: "draft-2020-12" } as const;

const Change = Schema.StructWithRest(Schema.Struct({ ref: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown),
]);

const Input = Schema.Struct({
  count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  change: Change,
  mode: Schema.Literal(true),
  tags: Schema.NonEmptyArray(Schema.String),
});

it("drops keywords that repeat JSON Schema defaults", () => {
  const schema = pipe(Input, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
  expect(compactInput(schema)["~standard"].jsonSchema.input(TARGET)).toStrictEqual({
    type: "object",
    properties: {
      count: { type: "integer", minimum: 1 },
      change: { type: "object", properties: { ref: { type: "string" } }, required: ["ref"] },
      mode: { type: "boolean", enum: [true] },
      tags: { type: "array", minItems: 1, items: { type: "string" } },
    },
    required: ["count", "change", "mode", "tags"],
  });
});

it("keeps properties and literal values named like noise keywords", () => {
  const node = {
    type: "object",
    properties: { additionalProperties: {}, $schema: { type: "string" } },
    default: { additionalProperties: true },
    additionalProperties: false,
  };
  expect(compactJsonSchema(node)).toStrictEqual(node);
});

it("validates with the original schema", () => {
  const schema = pipe(Input, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
  expect(compactInput(schema)["~standard"].validate).toBe(schema["~standard"].validate);
});

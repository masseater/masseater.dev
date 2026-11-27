import { CategoryIdSchema } from "@ocr-decide/measurements/ja-bench-schema";
import type { CategoryId } from "@ocr-decide/measurements/ja-bench-schema";
import { Schema } from "effect";

const SyntheticPageSchema = Schema.Struct({
  id: Schema.String,
  category: CategoryIdSchema,
  font: Schema.String,
  writing: Schema.Literals(["horizontal", "vertical"]),
  condition: Schema.Literals(["clean", "small", "degraded"]),
  tilt: Schema.optional(Schema.Finite),
  lines: Schema.Array(Schema.String),
});

export const SyntheticPagesSchema = SyntheticPageSchema.pipe(Schema.Array, Schema.fromJsonString);

const JaWildTextPageSchema = Schema.Struct({
  id: Schema.String,
  category: CategoryIdSchema,
  truth: Schema.String,
});

export const JaWildTextPagesSchema = JaWildTextPageSchema.pipe(Schema.Array, Schema.fromJsonString);

export type SyntheticPage = typeof SyntheticPageSchema.Type;

export interface Page {
  readonly id: string;
  readonly category: CategoryId;
  readonly truth: string;
  readonly image: string;
}

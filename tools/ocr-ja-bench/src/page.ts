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

const SyntheticPagesSchema = Schema.fromJsonString(Schema.Array(SyntheticPageSchema));

const JaWildTextPageSchema = Schema.Struct({
  id: Schema.String,
  category: CategoryIdSchema,
  truth: Schema.String,
});

const JaWildTextPagesSchema = Schema.fromJsonString(Schema.Array(JaWildTextPageSchema));

type SyntheticPage = typeof SyntheticPageSchema.Type;

interface Page {
  readonly id: string;
  readonly category: CategoryId;
  readonly truth: string;
  readonly image: string;
}

export { JaWildTextPagesSchema, SyntheticPagesSchema };
export type { Page, SyntheticPage };

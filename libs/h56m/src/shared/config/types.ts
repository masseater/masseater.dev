import { Schema } from "effect";

export interface H56mRule {
  readonly id: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly regex?: string;
  readonly path?: string;
  readonly valueGroup?: number;
  readonly specificity?: number;
  readonly tags?: readonly string[];
  readonly skipReport?: boolean;
  readonly filter?: string;
  readonly confidence?: "low" | "medium" | "high";
}

export interface H56mExtend {
  readonly useDefault?: boolean;
  readonly path?: string;
  readonly disabledRules?: readonly string[];
}

export interface H56mConfig {
  readonly extend?: H56mExtend;
  readonly prefilter?: string;
  readonly filter?: string;
  readonly rules?: readonly H56mRule[];
  readonly ignoredSecrets?: readonly string[];
}

export const FindingSchema = Schema.Struct({
  rule: Schema.String,
  description: Schema.String,
  confidence: Schema.Literals(["low", "medium", "high"]),
  path: Schema.String,
  line: Schema.Int,
  column: Schema.Int,
  endLine: Schema.Int,
  endColumn: Schema.Int,
  secret: Schema.String,
  digest: Schema.String,
  commit: Schema.optionalKey(Schema.String),
  encoded: Schema.Boolean,
});

export type Finding = typeof FindingSchema.Type;

export type GitSource =
  | { readonly type: "history"; readonly bases?: readonly string[]; readonly head: string }
  | { readonly type: "staged" }
  | { readonly type: "snapshot"; readonly revision: string };

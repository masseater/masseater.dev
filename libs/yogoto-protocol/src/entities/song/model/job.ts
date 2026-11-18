import { Schema } from "effect";

export const ModelInfoSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  stems: Schema.Array(Schema.String),
}).annotate({ identifier: "ModelInfo" });

export const JobKindSchema = Schema.Literals(["import", "separate", "analyze"]).annotate({
  identifier: "JobKind",
});

export const JobStateSchema = Schema.Literals(["queued", "running", "done", "failed"]).annotate({
  identifier: "JobState",
});

export const JobSchema = Schema.Struct({
  id: Schema.String,
  kind: JobKindSchema,
  label: Schema.String,
  songId: Schema.NullOr(Schema.String),
  state: JobStateSchema,
  progress: Schema.Finite,
  message: Schema.String,
  startedAt: Schema.Int,
}).annotate({ identifier: "Job" });

export const ImportRequestSchema = Schema.Struct({
  location: Schema.String,
  models: Schema.Array(Schema.String),
}).annotate({ identifier: "ImportRequest" });

export const AnalyzeRequestSchema = Schema.Struct({
  songId: Schema.String,
}).annotate({ identifier: "AnalyzeRequest" });

export const SeparateRequestSchema = Schema.Struct({
  songId: Schema.String,
  model: Schema.String,
}).annotate({ identifier: "SeparateRequest" });

export type ModelInfo = typeof ModelInfoSchema.Type;

export type JobKind = typeof JobKindSchema.Type;

export type JobState = typeof JobStateSchema.Type;

export type Job = typeof JobSchema.Type;

export type ImportRequest = typeof ImportRequestSchema.Type;

export type AnalyzeRequest = typeof AnalyzeRequestSchema.Type;

export type SeparateRequest = typeof SeparateRequestSchema.Type;

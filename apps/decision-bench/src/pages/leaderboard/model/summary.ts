import { SummarySchema } from "bench-summary/schema";
import type { Summary } from "bench-summary/schema";
import summaryJson from "bench-summary/summary";
import { Option, Schema } from "effect";

export type ModelResult = Summary["models"][number];
export type TaskResult = ModelResult["tasks"][number];
export type LabelStats = Summary["labeling"][number];

const EMPTY: Summary = { generatedAt: "", models: [], labeling: [] };

export const summary = Option.getOrElse(
  Schema.decodeUnknownOption(SummarySchema)(summaryJson),
  (): Summary => EMPTY,
);

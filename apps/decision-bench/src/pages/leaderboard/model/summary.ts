import { SummarySchema } from "bench-summary/schema";
import type { Summary } from "bench-summary/schema";
import summaryJson from "bench-summary/summary";
import { Option, Schema } from "effect";

type ModelResult = Summary["models"][number];
type TaskResult = ModelResult["tasks"][number];
type LabelStats = Summary["labeling"][number];

const EMPTY: Summary = { generatedAt: "", models: [], labeling: [] };

const summary = Option.getOrElse(
  Schema.decodeUnknownOption(SummarySchema)(summaryJson),
  (): Summary => EMPTY,
);

export { summary };
export type { LabelStats, ModelResult, TaskResult };

import type { TaskResult } from "./summary";

export const METRIC_NAMES: Readonly<Record<TaskResult["metric"], string>> = {
  "macro-f1": "macro-F1",
  "balanced-accuracy": "balanced accuracy",
  "normalized-mae": "1 - normalized MAE",
};

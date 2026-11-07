import type { TaskResult } from "#/pages/leaderboard/model/summary";

const METRIC_NAMES: Readonly<Record<TaskResult["metric"], string>> = {
  "macro-f1": "macro-F1",
  "balanced-accuracy": "balanced accuracy",
  "normalized-mae": "1 - normalized MAE",
};

export { METRIC_NAMES };

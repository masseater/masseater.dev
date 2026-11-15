import { isSplitChoice } from "bench-summary/schema";

import type { ModelResult, TaskResult } from "./summary";

export const SPLIT_MARK = "*";

export const displayLabel = ({
  model,
  result,
}: Readonly<{ model: ModelResult; result: TaskResult }>): string => {
  if (isSplitChoice({ format: result.format, choiceVia: model.choiceVia })) {
    return `${model.label}${SPLIT_MARK}`;
  }
  return model.label;
};

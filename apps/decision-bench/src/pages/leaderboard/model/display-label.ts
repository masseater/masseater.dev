import { isSplitChoice } from "bench-summary/schema";

import type { ModelResult, TaskResult } from "./summary";

const SPLIT_MARK = "*";

const displayLabel = ({
  model,
  result,
}: Readonly<{ model: ModelResult; result: TaskResult }>): string => {
  if (isSplitChoice({ format: result.format, choiceVia: model.choiceVia })) {
    return `${model.label}${SPLIT_MARK}`;
  }
  return model.label;
};

export { displayLabel, SPLIT_MARK };

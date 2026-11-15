import { percent } from "bench-summary/format";
import type { ReactNode } from "react";

import { displayLabel, withInterval, METRIC_NAMES } from "#/entities/benchmark/index.ts";
import type { TaskEntry, TaskInfo } from "#/entities/benchmark/index.ts";
import type { TableColumn } from "#/features/sort-table/index.ts";
import { SortableTable } from "#/features/sort-table/index.ts";

import { taskEntryColor, taskEntryKey } from "./task-entry";

const CAPTION = "成績（test）";
const LABEL = "モデル";

const UNSUPPORTED = "未対応";
const MISSING = "-";
const BOTTOM = -1;

const scored =
  (value: (entry: TaskEntry) => string) =>
  (entry: TaskEntry): string => {
    if (entry.result.support === "unsupported") {
      return MISSING;
    }
    return value(entry);
  };

const pairValue = ({ result }: TaskEntry): number => {
  if (result.test.pairs.status === "unavailable") {
    return BOTTOM;
  }
  return result.test.pairs.accuracy;
};

const pairText = ({ result }: TaskEntry): string => {
  if (result.test.pairs.status === "unavailable") {
    return MISSING;
  }
  return withInterval({ value: result.test.pairs.accuracy, interval: result.test.pairs.interval });
};

const skillText = ({ result }: TaskEntry): string => {
  if (result.support === "unsupported") {
    return UNSUPPORTED;
  }
  return withInterval({ value: result.test.skill, interval: result.test.skillInterval });
};

const columnsOf = (task: Readonly<TaskInfo>): readonly TableColumn<TaskEntry>[] => [
  {
    id: "skill",
    header: "skill（95% 区間）",
    sortValue: ({ result }) => result.test.skill,
    display: skillText,
  },
  {
    id: "raw",
    header: METRIC_NAMES[task.metric],
    sortValue: ({ result }) => result.test.raw,
    display: scored(({ result }) => percent(result.test.raw)),
  },
  {
    id: "accuracy",
    header: "正解率",
    sortValue: ({ result }) => result.test.accuracy,
    display: scored(({ result }) => percent(result.test.accuracy)),
  },
  { id: "pairs", header: "対の正解率（95% 区間）", sortValue: pairValue, display: pairText },
  {
    id: "coverage",
    header: "coverage",
    sortValue: ({ result }) => result.test.coverage,
    display: scored(({ result }) => `${percent(result.test.coverage)}%`),
  },
];

export const ScoreTable = ({
  task,
  entries,
}: Readonly<{ task: TaskInfo; entries: readonly TaskEntry[] }>): ReactNode => (
  <SortableTable
    id={`score-${task.task}`}
    caption={CAPTION}
    label={LABEL}
    rows={entries}
    keyOf={taskEntryKey}
    colorOf={taskEntryColor}
    labelOf={displayLabel}
    columns={columnsOf(task)}
  />
);

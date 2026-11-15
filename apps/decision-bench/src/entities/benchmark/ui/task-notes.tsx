import { Array as Arr, pipe } from "effect";
import { Asterisk, ListChecks, Ruler, Tag } from "lucide-react";

import { percent } from "#/entities/benchmark/lib/format";
import { SPLIT_MARK } from "#/entities/benchmark/model/display-label";
import { METRIC_NAMES } from "#/entities/benchmark/model/metric-names";
import type { TaskInfo } from "#/entities/benchmark/model/ranking";
import { summary } from "#/entities/benchmark/model/summary";
import type { LabelStats } from "#/entities/benchmark/model/summary";
import type { Note } from "#/shared/ui/note-list";

const SPLIT_NOTE: Note = {
  icon: <Asterisk aria-hidden="true" />,
  text: `${SPLIT_MARK} は選択肢ごとに Noul で聞いた結果`,
};

const goldNote = (stats: Readonly<LabelStats>): Note => {
  if ("opusMatchesHuman" in stats) {
    return {
      icon: <Tag aria-hidden="true" />,
      text: `正解は人のラベル（Opus 5.5 との一致率 ${percent(stats.opusMatchesHuman)}%）`,
    };
  }
  return { icon: <Tag aria-hidden="true" />, text: "正解は Opus 5.5 が 3 回とも一致したラベル" };
};

const splitNotes = (task: Readonly<TaskInfo>): readonly Note[] => {
  if (task.format === "choice") {
    return [SPLIT_NOTE];
  }
  return [];
};

const count = (value: number): string => value.toLocaleString("ja-JP");

const notesOf = (task: Readonly<TaskInfo>): readonly Note[] => [
  { icon: <Ruler aria-hidden="true" />, text: `${METRIC_NAMES[task.metric]} で採点` },
  {
    icon: <ListChecks aria-hidden="true" />,
    text: `test ${count(task.test)} 件を採点、hard ${count(task.hard)} 件は除外`,
  },
  ...pipe(
    summary.labeling,
    Arr.filter((stats) => stats.task === task.task),
    Arr.map((stats) => goldNote(stats)),
  ),
  ...splitNotes(task),
];

export { notesOf };

import { displayLabel } from "#/pages/leaderboard/model/display-label";
import type { TaskEntry } from "#/pages/leaderboard/model/ranking";
import type { ModelResult } from "#/pages/leaderboard/model/summary";
import { decimal, percent, usd, withInterval } from "#/pages/leaderboard/ui/format";
import { METRIC_NAMES } from "#/pages/leaderboard/ui/metric-names";

type DetailRow = Readonly<{ name: string; value: string }>;

type Detail = Readonly<{ title: string; rows: readonly DetailRow[] }>;

const identityRows = (model: Readonly<ModelResult>): readonly DetailRow[] => [
  { name: "provider", value: model.provider },
  { name: "id", value: model.model },
];

const calibrationRows = ({ result }: TaskEntry): readonly DetailRow[] => {
  if (result.test.calibration.status === "unavailable") {
    return [];
  }
  return [
    { name: "ECE", value: decimal(result.test.calibration.ece) },
    { name: "Brier", value: decimal(result.test.calibration.brier) },
  ];
};

const pairRows = ({ result }: TaskEntry): readonly DetailRow[] => {
  if (result.test.pairs.status === "unavailable") {
    return [];
  }
  return [
    {
      name: "対の正解率",
      value: withInterval({
        value: result.test.pairs.accuracy,
        interval: result.test.pairs.interval,
      }),
    },
  ];
};

const scoreRows = (entry: TaskEntry): readonly DetailRow[] => {
  const { test } = entry.result;
  if (entry.result.support === "unsupported") {
    return [{ name: "skill", value: "未対応" }];
  }
  return [
    {
      name: "skill（95% 区間）",
      value: withInterval({ value: test.skill, interval: test.skillInterval }),
    },
    { name: METRIC_NAMES[entry.result.metric], value: percent(test.raw) },
    { name: "正解率", value: percent(test.accuracy) },
    ...pairRows(entry),
    { name: "coverage", value: `${percent(test.coverage)}%` },
    ...calibrationRows(entry),
    { name: "p50 / p95 ms", value: `${entry.result.p50Ms} / ${entry.result.p95Ms}` },
    { name: "タスク全体の費用", value: usd(entry.result.costUsd) },
  ];
};

const taskDetail = (entry: TaskEntry): Detail => ({
  title: `${entry.mark} ${displayLabel(entry)}`,
  rows: [...identityRows(entry.model), ...scoreRows(entry)],
});

const indexDetail = (model: Readonly<ModelResult>): Detail => ({
  title: model.label,
  rows: [
    ...identityRows(model),
    { name: "指数", value: percent(model.index) },
    { name: "全タスクの費用", value: usd(model.costUsd) },
  ],
});

export { indexDetail, taskDetail };
export type { Detail };

import type { ReactNode } from "react";

import type { TaskEntry } from "#/entities/benchmark/model/ranking.ts";

import { BarChart } from "./bar-chart.tsx";
import { ChartFigure } from "./chart-figure.tsx";
import { ModelKey } from "./model-key.tsx";
import { COST_AXIS, LATENCY_AXIS, scatterPoints } from "./scatter-points.ts";
import { ScoreScatter } from "./score-scatter.tsx";
import { skillRows } from "./skill-rows.ts";

const SKILL_TITLE = "skill";
const LATENCY_TITLE = "skill × p50 レイテンシ";
const COST_TITLE = "skill × タスク全体の費用";

export const TaskCharts = ({ entries }: Readonly<{ entries: readonly TaskEntry[] }>): ReactNode => (
  <div className="flex flex-col gap-10">
    <ChartFigure title={SKILL_TITLE}>
      <BarChart title={SKILL_TITLE} rows={skillRows(entries)} />
    </ChartFigure>
    <ChartFigure title={LATENCY_TITLE}>
      <ScoreScatter
        title={LATENCY_TITLE}
        axis={LATENCY_AXIS}
        points={scatterPoints({
          entries,
          axis: LATENCY_AXIS,
          measureOf: ({ result }) => result.p50Ms,
        })}
      />
    </ChartFigure>
    <ChartFigure title={COST_TITLE}>
      <ScoreScatter
        title={COST_TITLE}
        axis={COST_AXIS}
        points={scatterPoints({
          entries,
          axis: COST_AXIS,
          measureOf: ({ result }) => result.costUsd,
        })}
      />
    </ChartFigure>
    <ModelKey entries={entries} />
  </div>
);

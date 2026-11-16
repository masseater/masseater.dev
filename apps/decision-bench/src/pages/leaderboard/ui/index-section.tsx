import type { ReactNode } from "react";

import { BarChart, ChartFigure } from "#/entities/benchmark/index.ts";
import { useVisibleModels } from "#/features/filter-models/index.ts";
import { Section } from "#/shared/ui/section.tsx";

import { rowsOf } from "./index-rows.ts";
import { IndexTable } from "./index-table.tsx";

const CHART_TITLE = "指数";

export const IndexSection = (): ReactNode => {
  const models = useVisibleModels();
  return (
    <Section id="index" title="総合指数（参考）">
      <ChartFigure title={CHART_TITLE}>
        <BarChart title={CHART_TITLE} rows={rowsOf(models)} />
      </ChartFigure>
      <IndexTable models={models} />
    </Section>
  );
};

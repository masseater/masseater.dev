import type { ReactNode } from "react";

import { BarChart, ChartFigure } from "#/entities/benchmark";
import { useVisibleModels } from "#/features/filter-models";
import { Section } from "#/shared/ui/section";

import { rowsOf } from "./index-rows";
import { IndexTable } from "./index-table";

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

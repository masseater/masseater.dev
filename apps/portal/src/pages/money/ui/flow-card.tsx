import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { MoneyFlowValue } from "#/entities/money/index.ts";
import { hasDetail, summarized } from "#/pages/money/model/flow.ts";
import { Section } from "#/shared/ui/index.ts";

import { FlowChart } from "./flow-chart.tsx";
import { FlowTabs } from "./flow-tabs.tsx";

const TITLE = "収支の流れ";

const EMPTY = "この期間の取引はありません";

const route = getRouteApi("/money");

const shownFlow = ({
  flow,
  summary,
}: Readonly<{ flow: MoneyFlowValue; summary: boolean }>): MoneyFlowValue => {
  if (summary) {
    return summarized(flow);
  }
  return flow;
};

export const FlowCard = ({
  asOf,
  flow,
}: Readonly<{ asOf: string; flow: MoneyFlowValue }>): ReactNode => {
  const search = route.useSearch();
  const summary = search.flow === "summary";
  const shown = shownFlow({ flow, summary });
  return (
    <Section meta={`${asOf} 時点`} title={TITLE}>
      {hasDetail(flow) && <FlowTabs summary={summary} />}
      {Arr.isReadonlyArrayEmpty(flow.links) && (
        <p className="text-muted-foreground text-sm">{EMPTY}</p>
      )}
      {Arr.isReadonlyArrayNonEmpty(flow.links) && (
        <div className="-mx-2 overflow-x-auto px-2">
          <FlowChart flow={shown} title={TITLE} />
        </div>
      )}
    </Section>
  );
};

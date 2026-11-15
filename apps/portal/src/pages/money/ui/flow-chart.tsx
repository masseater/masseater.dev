import { useMemo } from "react";
import type { ReactNode } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { yen } from "#/entities/money";
import type { MoneyFlowValue } from "#/entities/money";
import { flowHeight, sankeyInput } from "#/pages/money/model/flow";

import { FlowLink } from "./flow-link";
import { FlowNode } from "./flow-node";

const NODE_WIDTH = 16;

const NODE_PADDING = 28;

const MIN_WIDTH = 720;

const MARGIN = { top: 24, right: 8, bottom: 8, left: 8 } as const;

const INITIAL_DIMENSION = { width: 960, height: 360 } as const;

const asYen = (value: unknown): string => yen(Number(value));

export const FlowChart = ({
  flow,
  title,
}: Readonly<{ flow: MoneyFlowValue; title: string }>): ReactNode => {
  const data = useMemo(() => sankeyInput(flow), [flow]);
  const whole = Math.max(flow.income, flow.expense);
  const node = useMemo(() => <FlowNode nodes={flow.nodes} whole={whole} />, [flow.nodes, whole]);
  const link = useMemo(() => <FlowLink flow={flow} />, [flow]);
  return (
    <ResponsiveContainer
      height={flowHeight(flow)}
      initialDimension={INITIAL_DIMENSION}
      minWidth={MIN_WIDTH}
    >
      <Sankey
        data={data}
        desc={title}
        link={link}
        margin={MARGIN}
        node={node}
        nodePadding={NODE_PADDING}
        nodeWidth={NODE_WIDTH}
        sort={false}
      >
        <Tooltip formatter={asYen} />
      </Sankey>
    </ResponsiveContainer>
  );
};

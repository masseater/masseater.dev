import { useMemo } from "react";
import type { ReactNode } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { yen } from "#/entities/money";
import type { MoneyFlowValue } from "#/entities/money";
import { flowHeight, sankeyInput } from "#/pages/money/model/flow";

import { FlowNode } from "./flow-node";

const NODE_WIDTH = 6;

const NODE_PADDING = 18;

const MIN_WIDTH = 640;

const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 } as const;

const INITIAL_DIMENSION = { width: 720, height: 280 } as const;

const LINK = { stroke: "var(--foreground)", strokeOpacity: 0.12 } as const;

const asYen = (value: unknown): string => yen(Number(value));

export const FlowChart = ({
  flow,
  title,
}: Readonly<{ flow: MoneyFlowValue; title: string }>): ReactNode => {
  const data = useMemo(() => sankeyInput(flow), [flow]);
  const node = useMemo(() => <FlowNode nodes={flow.nodes} />, [flow.nodes]);
  return (
    <ResponsiveContainer
      height={flowHeight(flow)}
      initialDimension={INITIAL_DIMENSION}
      minWidth={MIN_WIDTH}
    >
      <Sankey
        data={data}
        desc={title}
        link={LINK}
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

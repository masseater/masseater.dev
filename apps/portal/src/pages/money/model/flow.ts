import { Array as Arr, Option, pipe } from "effect";
import type { SankeyData, TextAnchor, YAxisOrientation } from "recharts";

import type { FlowNodeValue, MoneyFlowValue } from "#/entities/money";

export type Placement = Readonly<{
  anchor: Exclude<TextAnchor, "middle">;
  side: YAxisOrientation;
}>;

const ROW_HEIGHT = 34;

const MIN_HEIGHT = 280;

const MISSING = -1;

export const FILLS: Readonly<Record<FlowNodeValue["nodeType"], string>> = {
  income: "var(--chart-income)",
  "income-sub": "var(--chart-income)",
  total: "var(--foreground)",
  expense: "var(--chart-expense)",
  "expense-sub": "var(--chart-expense)",
};

const LEFT: Placement = { anchor: "start", side: "left" };

const RIGHT: Placement = { anchor: "end", side: "right" };

export const PLACEMENTS: Readonly<Record<FlowNodeValue["nodeType"], Placement>> = {
  income: LEFT,
  "income-sub": LEFT,
  total: LEFT,
  expense: RIGHT,
  "expense-sub": RIGHT,
};

const onRight = (node: FlowNodeValue): boolean => PLACEMENTS[node.nodeType].side === "right";

export const sankeyInput = (flow: MoneyFlowValue): SankeyData => {
  const indexOf = (id: string): number =>
    pipe(
      Arr.findFirstIndex(flow.nodes, (node) => node.id === id),
      Option.getOrElse(() => MISSING),
    );
  return {
    nodes: pipe(
      flow.nodes,
      Arr.map((node) => ({ name: node.label })),
    ),
    links: pipe(
      flow.links,
      Arr.map((link) => ({
        source: indexOf(link.source),
        target: indexOf(link.target),
        value: link.value,
      })),
    ),
  };
};

export const flowHeight = (flow: MoneyFlowValue): number => {
  const right = pipe(flow.nodes, Arr.filter(onRight)).length;
  return Math.max(MIN_HEIGHT, Math.max(flow.nodes.length - right, right) * ROW_HEIGHT);
};

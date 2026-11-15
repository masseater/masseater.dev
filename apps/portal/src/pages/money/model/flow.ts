import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { SankeyData, TextAnchor, YAxisOrientation } from "recharts";

import type { FlowNodeValue, MoneyFlowValue } from "#/entities/money/index.ts";

export type Placement = Readonly<{
  anchor: Exclude<TextAnchor, "middle">;
  side: YAxisOrientation;
}>;

export type Tone = "income" | "expense" | "total" | "savings";

const ROW_HEIGHT = 44;

const MIN_HEIGHT = 360;

const MISSING = -1;

const SAVINGS = ":savings";

const SUBS: readonly FlowNodeValue["nodeType"][] = ["income-sub", "expense-sub"];

const TONES: Readonly<Record<FlowNodeValue["nodeType"], Tone>> = {
  income: "income",
  "income-sub": "income",
  total: "total",
  expense: "expense",
  "expense-sub": "expense",
};

export const toneOf = (node: FlowNodeValue): Tone => {
  if (Str.endsWith(SAVINGS)(node.id)) {
    return "savings";
  }
  return TONES[node.nodeType];
};

export const FILLS: Readonly<Record<Tone, string>> = {
  income: "var(--income)",
  expense: "var(--expense)",
  total: "var(--color-solid-gray-800)",
  savings: "var(--color-solid-gray-536)",
};

export const LINK_FILLS: Readonly<Record<Tone, string>> = {
  income: "var(--color-green-100)",
  expense: "var(--color-red-100)",
  total: "var(--color-solid-gray-100)",
  savings: "var(--color-solid-gray-100)",
};

export const TEXT_FILLS: Readonly<Record<Tone, string>> = {
  income: "var(--color-green-800)",
  expense: "var(--color-red-900)",
  total: "var(--color-solid-gray-900)",
  savings: "var(--color-solid-gray-700)",
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

const isSub = (node: FlowNodeValue): boolean => Arr.contains(SUBS, node.nodeType);

export const summarized = (flow: MoneyFlowValue): MoneyFlowValue => {
  const kept = pipe(
    flow.nodes,
    Arr.filter((node) => !isSub(node)),
  );
  const ids = pipe(
    kept,
    Arr.map((node) => node.id),
  );
  return {
    ...flow,
    nodes: kept,
    links: pipe(
      flow.links,
      Arr.filter((link) => Arr.contains(ids, link.source) && Arr.contains(ids, link.target)),
    ),
  };
};

export const hasDetail = (flow: MoneyFlowValue): boolean => pipe(flow.nodes, Arr.some(isSub));

const indexIn =
  (flow: MoneyFlowValue) =>
  (id: string): number =>
    pipe(
      flow.nodes,
      Arr.findFirstIndex((node) => node.id === id),
      Option.getOrElse(() => MISSING),
    );

export const sankeyInput = (flow: MoneyFlowValue): SankeyData => {
  const indexOf = indexIn(flow);
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

export const linkTone =
  (flow: MoneyFlowValue) =>
  (index: number): Tone =>
    pipe(
      Arr.get(flow.links, index),
      Option.flatMap((link) =>
        pipe(
          flow.nodes,
          Arr.findFirst(
            (node) => node.id !== "total" && (node.id === link.source || node.id === link.target),
          ),
        ),
      ),
      Option.match({ onNone: (): Tone => "total", onSome: toneOf }),
    );

export const flowHeight = (flow: MoneyFlowValue): number => {
  const right = pipe(flow.nodes, Arr.filter(onRight), Arr.length);
  return Math.max(MIN_HEIGHT, Math.max(flow.nodes.length - right, right) * ROW_HEIGHT);
};

const PERCENT = 100;

const NONE = 0;

const TINY = 1;

export const shareOf = ({ value, whole }: Readonly<{ value: number; whole: number }>): string => {
  if (whole <= NONE) {
    return "";
  }
  const share = (value / whole) * PERCENT;
  if (share < TINY) {
    return "<1%";
  }
  return `${String(Math.round(share))}%`;
};

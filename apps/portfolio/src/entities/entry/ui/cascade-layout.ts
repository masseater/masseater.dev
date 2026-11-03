import { Position } from "@xyflow/react";
import type { Edge, Node, NodeHandle } from "@xyflow/react";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { CSSProperties } from "react";

import {
  cascadeLinks,
  cascadeNodes,
  linkDirection,
  roundOf,
  stages,
  stopDelays,
} from "#/entities/entry/model/cascade";
import type {
  CascadeLink,
  CascadeNode,
  CascadeState,
  Column,
  LinkDirection,
  StopDelays,
} from "#/entities/entry/model/cascade";

type Status = "running" | "stopped";

type ServiceData = Readonly<{
  label: string;
  detail: string;
  status: Status;
  round: number;
}>;

type ServiceNode = Node<ServiceData, "service">;

type StageNode = Node<Readonly<{ label: string }>, "stage">;

const NODE_WIDTH = 160;

const NODE_HEIGHT = 56;

const HALF = 2;

const HANDLE_SIZE = 1;

const STAGE_WIDTH = 452;

const STAGE_HEADER = 40;

const ROW_HEIGHT = 76;

const STAGE_GAP = 24;

const TOP = 0;

const NO_DELAY = 0;

const columnX = { left: 16, right: 276 } as const satisfies Record<Column, number>;

const handles: NodeHandle[] = [
  {
    id: "r",
    type: "source",
    position: Position.Right,
    x: NODE_WIDTH,
    y: NODE_HEIGHT / HALF,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  },
  {
    id: "b",
    type: "source",
    position: Position.Bottom,
    x: NODE_WIDTH / HALF,
    y: NODE_HEIGHT,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  },
  {
    id: "l",
    type: "target",
    position: Position.Left,
    x: TOP,
    y: NODE_HEIGHT / HALF,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  },
  {
    id: "t",
    type: "target",
    position: Position.Top,
    x: NODE_WIDTH / HALF,
    y: TOP,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  },
];

const handlesOf = {
  down: { sourceHandle: "b", targetHandle: "t" },
  across: { sourceHandle: "r", targetHandle: "l" },
  "down-across": { sourceHandle: "b", targetHandle: "l" },
} as const satisfies Record<
  LinkDirection,
  Readonly<{ sourceHandle: string; targetHandle: string }>
>;

const stageHeight = (rows: number): number => STAGE_HEADER + rows * ROW_HEIGHT;

const [stagesBottom, stageTops] = pipe(
  stages,
  Arr.mapAccum(TOP, (top, stage) => [top + stageHeight(stage.rows) + STAGE_GAP, top] as const),
);

const FLOW_HEIGHT = stagesBottom - STAGE_GAP;

const stageNodes: readonly StageNode[] = pipe(
  stages,
  Arr.zip(stageTops),
  Arr.map(([stage, top]) => ({
    id: stage.id,
    type: "stage" as const,
    position: { x: TOP, y: top },
    width: STAGE_WIDTH,
    height: stageHeight(stage.rows),
    focusable: false,
    data: { label: stage.label },
  })),
);

const delayOf = (delays: StopDelays, id: string): Option.Option<number> => Rec.get(delays, id);

const statusOf = (delay: Option.Option<number>): Status =>
  Option.match(delay, { onNone: () => "running", onSome: () => "stopped" });

const delayMsOf = (delay: Option.Option<number>): number => Option.getOrElse(delay, () => NO_DELAY);

const delayStyle = (delay: Option.Option<number>): CSSProperties => ({
  "--cascade-delay": `${delayMsOf(delay)}ms`,
});

const serviceNode =
  (delays: StopDelays, round: number) =>
  (node: CascadeNode): ServiceNode => {
    const delay = delayOf(delays, node.id);
    return {
      id: node.id,
      type: "service",
      parentId: node.stage,
      extent: "parent",
      position: { x: columnX[node.column], y: STAGE_HEADER + node.row * ROW_HEIGHT },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      handles,
      focusable: false,
      style: { pointerEvents: "all", ...delayStyle(delay) },
      data: {
        label: node.label,
        detail: node.detail,
        status: statusOf(delay),
        round,
      },
    };
  };

type EdgeClasses = Readonly<Record<Status, string>>;

const edgeOf =
  (delays: StopDelays, round: number, classes: EdgeClasses) =>
  (link: CascadeLink): Edge => {
    const delay = delayOf(delays, link.source);
    return {
      id: `${link.source}-${link.target}-${round}`,
      source: link.source,
      target: link.target,
      ...handlesOf[linkDirection(link)],
      type: "smoothstep",
      label: link.label,
      markerEnd: { type: "arrowclosed", width: 16, height: 16 },
      focusable: false,
      className: classes[statusOf(delay)],
      style: delayStyle(delay),
    };
  };

const nodesOf = (state: CascadeState): Node[] => {
  const toNode = serviceNode(stopDelays(state), roundOf(state));
  return [...stageNodes, ...pipe(cascadeNodes, Arr.map(toNode))];
};

const edgesOf =
  (classes: EdgeClasses) =>
  (state: CascadeState): Edge[] => {
    const toEdge = edgeOf(stopDelays(state), roundOf(state), classes);
    return pipe(cascadeLinks, Arr.map(toEdge));
  };

export type { EdgeClasses, ServiceData, ServiceNode, StageNode, Status };
export { FLOW_HEIGHT, STAGE_WIDTH, edgesOf, nodesOf };

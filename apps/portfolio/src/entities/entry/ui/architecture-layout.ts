import { MarkerType, Position } from "@xyflow/react";
import type { Edge, EdgeMarker, Node, NodeHandle } from "@xyflow/react";
import { Array as Arr, Record as Rec, pipe } from "effect";

import {
  HALF,
  HANDLE_SIZE,
  ORIGIN,
  SERVICE_HEIGHT,
  SERVICE_WIDTH,
  TILE_LEFT,
  TILE_MIDDLE,
  TILE_SIZE,
  VISITOR,
  WHOLE,
  groupBoxes,
  groupData,
} from "./architecture-grid";
import type {
  Box,
  GroupNode,
  LinkKind,
  LinkSpec,
  Point,
  Route,
  ServiceNode,
  Side,
  StepLink,
} from "./architecture-grid";
import { links } from "./architecture-links";
import { services } from "./architecture-services";

const positionOf = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const satisfies Record<Side, Position>;

const SIDES = ["top", "right", "bottom", "left"] as const satisfies readonly Side[];

const HANDLE_TYPES = ["source", "target"] as const;

const handlesAt = (point: (side: Side) => Point): NodeHandle[] =>
  pipe(
    SIDES,
    Arr.flatMap((side) =>
      pipe(
        HANDLE_TYPES,
        Arr.map((type) => ({
          id: `${side}-${type}`,
          type,
          position: positionOf[side],
          x: point(side).x,
          y: point(side).y,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
        })),
      ),
    ),
  );

const servicePoint = {
  top: { x: SERVICE_WIDTH / HALF, y: ORIGIN },
  right: { x: TILE_LEFT + TILE_SIZE, y: TILE_MIDDLE },
  bottom: { x: SERVICE_WIDTH / HALF, y: SERVICE_HEIGHT },
  left: { x: TILE_LEFT, y: TILE_MIDDLE },
} as const satisfies Record<Side, Point>;

const serviceHandles = handlesAt((side) => servicePoint[side]);

const boxPoint = (box: Box, side: Side): Point => {
  const points = {
    top: { x: box.width / HALF, y: ORIGIN },
    right: { x: box.width, y: box.height / HALF },
    bottom: { x: box.width / HALF, y: box.height },
    left: { x: ORIGIN, y: box.height / HALF },
  } as const satisfies Record<Side, Point>;
  return points[side];
};

const groupIds = Rec.keys(groupBoxes);

const groupNodes: readonly GroupNode[] = pipe(
  groupIds,
  Arr.map((id) => ({
    id,
    type: "group" as const,
    position: { x: groupBoxes[id].x, y: groupBoxes[id].y },
    width: groupBoxes[id].width,
    height: groupBoxes[id].height,
    handles: handlesAt((side) => boxPoint(groupBoxes[id], side)),
    focusable: false,
    selectable: false,
    data: groupData[id],
  })),
);

const serviceNodes: readonly ServiceNode[] = pipe(
  services,
  Arr.map((spec) => ({
    id: spec.id,
    type: "service" as const,
    parentId: spec.group,
    extent: "parent" as const,
    position: spec.at,
    width: SERVICE_WIDTH,
    height: SERVICE_HEIGHT,
    handles: serviceHandles,
    focusable: false,
    data: {
      name: spec.name,
      note: spec.note,
      glyph: spec.glyph,
      tone: groupData[spec.group].tone,
    },
  })),
);

const visitorNode: ServiceNode = {
  id: "visitor",
  type: "service",
  position: VISITOR,
  width: SERVICE_WIDTH,
  height: SERVICE_HEIGHT,
  handles: serviceHandles,
  focusable: false,
  data: { name: "訪問者", note: "ブラウザ / クローラー", glyph: "user", tone: "gh" },
};

const MARKER_SIZE = 16;

const markerColor = {
  main: "var(--architecture-main)",
  api: "var(--architecture-api)",
  dash: "var(--architecture-api)",
} as const satisfies Record<LinkKind, string>;

const markerOf = (kind: LinkKind): EdgeMarker => ({
  type: MarkerType.ArrowClosed,
  width: MARKER_SIZE,
  height: MARKER_SIZE,
  color: markerColor[kind],
});

const SHARP = 0;

type LinkClasses = Readonly<Record<LinkKind, string>>;

const toEdge =
  (classes: LinkClasses) =>
  ({
    from: [source, sourceSide],
    to: [target, targetSide],
    kind,
    label,
    route,
  }: LinkSpec): StepLink => ({
    id: `${source}-${target}`,
    type: "smoothstep",
    source,
    sourceHandle: `${sourceSide}-source`,
    target,
    targetHandle: `${targetSide}-target`,
    label,
    className: classes[kind],
    markerEnd: markerOf(kind),
    pathOptions: { borderRadius: SHARP, stepPosition: route.stepPosition, offset: route.offset },
    focusable: false,
  });

const reversedRoute = (route: Route): Route => ({
  stepPosition: WHOLE - route.stepPosition,
  offset: route.offset,
});

const reverse = (spec: LinkSpec): LinkSpec => ({
  from: spec.to,
  to: spec.from,
  kind: spec.kind,
  label: "",
  route: reversedRoute(spec.route),
  both: false,
});

const architectureNodes: Node[] = [...groupNodes, visitorNode, ...serviceNodes];

const architectureEdges = (classes: LinkClasses): Edge[] => [
  ...pipe(links, Arr.map(toEdge(classes))),
  ...pipe(
    links,
    Arr.filter((spec) => spec.both),
    Arr.map((spec) => toEdge(classes)(reverse(spec))),
  ),
];

export type { LinkClasses };
export { architectureEdges, architectureNodes };

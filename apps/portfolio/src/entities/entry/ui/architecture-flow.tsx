"use client";

import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import type { CSSProperties, ReactNode } from "react";

import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH } from "./architecture-grid";
import { ArchitectureGroup } from "./architecture-group";
import { architectureEdges, architectureNodes } from "./architecture-layout";
import type { LinkClasses } from "./architecture-layout";
import { ArchitectureService } from "./architecture-service";

const nodeTypes = { group: ArchitectureGroup, service: ArchitectureService };

const fitViewOptions = { padding: 0.03 };

const MIN_ZOOM = 0.2;

const MAX_ZOOM = 2;

const GRID = 24;

const linkClasses: LinkClasses = {
  main: "architecture-link architecture-link-main",
  api: "architecture-link",
  dash: "architecture-link architecture-link-dash",
};

const edges = architectureEdges(linkClasses);

const frameStyle: CSSProperties = {
  "--architecture-aspect": `${DIAGRAM_WIDTH} / ${DIAGRAM_HEIGHT}`,
};

const ArchitectureFlow = (): ReactNode => (
  <div className="architecture w-full" style={frameStyle}>
    <ReactFlow
      edges={edges}
      elementsSelectable={false}
      fitView
      fitViewOptions={fitViewOptions}
      height={DIAGRAM_HEIGHT}
      maxZoom={MAX_ZOOM}
      minZoom={MIN_ZOOM}
      nodeTypes={nodeTypes}
      nodes={architectureNodes}
      nodesConnectable={false}
      nodesDraggable={false}
      nodesFocusable={false}
      preventScrolling={false}
      width={DIAGRAM_WIDTH}
      zoomOnScroll={false}
    >
      <Background gap={GRID} variant={BackgroundVariant.Lines} />
      <Controls className="architecture-controls" showInteractive={false} />
    </ReactFlow>
  </div>
);

export { ArchitectureFlow };

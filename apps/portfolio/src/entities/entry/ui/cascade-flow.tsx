"use client";

import { Background, BackgroundVariant, ReactFlow } from "@xyflow/react";
import { Array as Arr, pipe } from "effect";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

import { started } from "#/entities/entry/model/cascade";
import { useCascadeState, useUpdateCascade } from "#/entities/entry/model/cascade-state";

import { FLOW_HEIGHT, STAGE_WIDTH } from "./cascade-frame";
import { edgesOf, nodesOf } from "./cascade-layout";
import type { EdgeClasses } from "./cascade-layout";
import { CascadeService } from "./cascade-service";
import { CascadeStage } from "./cascade-stage";

const nodeTypes = { service: CascadeService, stage: CascadeStage };

const fitViewOptions = { padding: 0.02 };

const observerOptions = { threshold: 0.4 };

const GRID = 24;

const edgeClasses: EdgeClasses = {
  running: "cascade-edge",
  stopped: "cascade-edge cascade-edge-stopped",
};

const cascadeEdges = edgesOf(edgeClasses);

const frameStyle: CSSProperties = { "--cascade-aspect": `${STAGE_WIDTH} / ${FLOW_HEIGHT}` };

const usePlayOnView = (): RefObject<HTMLDivElement | null> => {
  const update = useUpdateCascade();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        pipe(
          entries,
          Arr.some(({ isIntersecting }) => isIntersecting),
        )
      ) {
        observer.disconnect();
        update(started);
      }
    }, observerOptions);
    if (ref.current !== null) {
      observer.observe(ref.current);
    }
    return (): void => {
      observer.disconnect();
    };
  }, [update]);
  return ref;
};

const CascadeFlow = (): ReactNode => {
  const state = useCascadeState();
  const ref = usePlayOnView();
  return (
    <div className="cascade-failure w-full" ref={ref} style={frameStyle}>
      <ReactFlow
        edges={cascadeEdges(state)}
        elementsSelectable={false}
        fitView
        fitViewOptions={fitViewOptions}
        height={FLOW_HEIGHT}
        nodeTypes={nodeTypes}
        nodes={nodesOf(state)}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        panOnDrag={false}
        preventScrolling={false}
        width={STAGE_WIDTH}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
      >
        <Background gap={GRID} variant={BackgroundVariant.Lines} />
      </ReactFlow>
    </div>
  );
};

export { CascadeFlow };

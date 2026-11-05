"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { clicked } from "#/entities/entry/model/cascade";
import { useUpdateCascade } from "#/entities/entry/model/cascade-state";

import { CascadeLabel } from "./cascade-label";
import type { ServiceNode, Status } from "./cascade-layout";

const serviceClass = {
  running: "cascade-service",
  stopped: "cascade-service cascade-service-stopped",
} as const satisfies Record<Status, string>;

const CascadeService = ({ id, data }: Readonly<NodeProps<ServiceNode>>): ReactNode => {
  const update = useUpdateCascade();
  const toggle = useCallback(() => {
    update(clicked(id));
  }, [update, id]);
  return (
    <>
      <Handle className="invisible" id="l" position={Position.Left} type="target" />
      <Handle className="invisible" id="t" position={Position.Top} type="target" />
      <button
        aria-label={data.label}
        className={serviceClass[data.status]}
        key={data.round}
        onClick={toggle}
        type="button"
      >
        <span className="cascade-lamp" />
        <CascadeLabel detail={data.detail} label={data.label} />
      </button>
      <Handle className="invisible" id="r" position={Position.Right} type="source" />
      <Handle className="invisible" id="b" position={Position.Bottom} type="source" />
    </>
  );
};

export { CascadeService };

import type { NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

import { ArchitectureGlyph } from "./architecture-glyph";
import type { ServiceNode } from "./architecture-grid";
import { ArchitectureHandles } from "./architecture-handles";

const TILE_ICON = 28;

const ArchitectureService = ({ data }: Readonly<NodeProps<ServiceNode>>): ReactNode => (
  <div className="architecture-service">
    <ArchitectureHandles />
    <span className="architecture-tile">
      <ArchitectureGlyph name={data.glyph} size={TILE_ICON} tone={data.tone} />
    </span>
    <span className="architecture-name">{data.name}</span>
    <span className="architecture-note">{data.note}</span>
  </div>
);

export { ArchitectureService };

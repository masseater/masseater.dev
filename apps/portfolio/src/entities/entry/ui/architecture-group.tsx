import type { NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

import { ArchitectureGlyph } from "./architecture-glyph";
import type { GroupNode } from "./architecture-grid";
import { ArchitectureHandles } from "./architecture-handles";

const TITLE_ICON = 15;

const TITLE_CLASS = {
  "top-left": "architecture-group-title architecture-group-title-top-left",
  "bottom-right": "architecture-group-title architecture-group-title-bottom-right",
} as const satisfies Record<GroupNode["data"]["titleAt"], string>;

const ArchitectureGroup = ({ data }: Readonly<NodeProps<GroupNode>>): ReactNode => (
  <div className={`architecture-group architecture-group-${data.tone}`}>
    <ArchitectureHandles />
    <span className={TITLE_CLASS[data.titleAt]}>
      <ArchitectureGlyph name={data.glyph} size={TITLE_ICON} tone={data.tone} />
      {data.title}
    </span>
  </div>
);

export { ArchitectureGroup };

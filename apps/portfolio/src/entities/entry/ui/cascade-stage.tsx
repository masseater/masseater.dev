import type { NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

import type { StageNode } from "./cascade-layout";

const CascadeStage = ({ data }: Readonly<NodeProps<StageNode>>): ReactNode => (
  <div className="border-border bg-card/70 size-full rounded-xl border px-4 pt-3 text-right">
    <span className="text-muted-foreground text-xs font-semibold">{data.label}</span>
  </div>
);

export { CascadeStage };

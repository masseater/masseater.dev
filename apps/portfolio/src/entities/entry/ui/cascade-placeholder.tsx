import type { CSSProperties, ReactNode } from "react";

import { FLOW_HEIGHT, STAGE_WIDTH } from "./cascade-frame";

const frameStyle: CSSProperties = { "--cascade-aspect": `${STAGE_WIDTH} / ${FLOW_HEIGHT}` };

const CascadePlaceholder = (): ReactNode => (
  <div className="mx-auto w-full max-w-lg">
    <div className="mb-2 h-6" />
    <div className="cascade-failure w-full" style={frameStyle} />
  </div>
);

export { CascadePlaceholder };

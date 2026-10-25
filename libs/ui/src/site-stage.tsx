import type { ReactNode } from "react";

import { Backdrop } from "./backdrop.tsx";
import { followViewportPointer, releaseStageLayers } from "./pointer.ts";

const SiteStage = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div
    className="stage relative isolate flex min-h-dvh flex-col"
    onPointerCancel={releaseStageLayers}
    onPointerLeave={releaseStageLayers}
    onPointerMove={followViewportPointer}
  >
    <div className="stage fixed inset-0 -z-10" data-stage-layer>
      <Backdrop />
    </div>
    {children}
  </div>
);

export { SiteStage };

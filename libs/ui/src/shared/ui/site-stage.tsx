import type { ReactNode } from "react";

import { followViewportPointer, releaseStageLayers } from "#/shared/lib/pointer.ts";

import { Backdrop } from "./backdrop.tsx";

export const SiteStage = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
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

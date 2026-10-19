import type { ReactNode } from "react";

import { Backdrop } from "./backdrop.tsx";
import { followViewportPointer, releasePointer } from "./pointer.ts";

const SiteStage = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div
    className="stage relative isolate flex min-h-dvh flex-col"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followViewportPointer}
  >
    <div className="fixed inset-0 -z-10">
      <Backdrop />
    </div>
    {children}
  </div>
);

export { SiteStage };

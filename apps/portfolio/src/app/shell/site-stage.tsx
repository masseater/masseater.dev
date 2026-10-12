import type { ReactNode } from "react";

import { followViewportPointer, releasePointer } from "#/shared/lib";
import { Backdrop } from "#/shared/ui";

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

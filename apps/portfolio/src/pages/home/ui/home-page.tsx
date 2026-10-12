import type { ReactNode } from "react";

import { followPointer, releasePointer } from "#/shared/lib";
import { Backdrop } from "#/shared/ui";

import { ProfileHeader } from "./profile-header";

const HomePage = (): ReactNode => (
  <main
    className="stage relative isolate grid min-h-dvh place-items-center overflow-hidden px-4"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
  >
    <Backdrop />
    <ProfileHeader />
  </main>
);

export { HomePage };

import { Backdrop, followPointer, releasePointer } from "@masseater.dev/ui";
import type { ReactNode } from "react";

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

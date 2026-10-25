import { followPointer, releasePointer } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import { AboutCue } from "./about-cue";
import { ProfileHeader } from "./profile-header";

const HeroSection = (): ReactNode => (
  <section
    className="stage relative isolate grid min-h-dvh snap-start place-items-center overflow-hidden px-4"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
  >
    <ProfileHeader />
    <AboutCue />
  </section>
);

export { HeroSection };

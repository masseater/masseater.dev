import type { ReactNode } from "react";

import { Danmaku } from "./danmaku";
import { HeroPanel } from "./hero-panel";

const HeroScreen = (): ReactNode => (
  <div className="relative">
    <Danmaku />
    <div className="relative flex justify-center px-4 py-14 sm:py-20">
      <HeroPanel />
    </div>
  </div>
);

export { HeroScreen };

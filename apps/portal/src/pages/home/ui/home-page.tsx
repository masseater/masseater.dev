import type { ReactNode } from "react";

import { Guarded } from "./guarded.tsx";
import { HomeMain } from "./home-main.tsx";
import { HomeSide } from "./home-side.tsx";
import { HomeStats } from "./home-stats.tsx";

export const HomePage = (): ReactNode => (
  <>
    <Guarded>
      <HomeStats />
    </Guarded>
    <div className="grid min-w-0 gap-5 xl:grid-cols-3">
      <HomeMain />
      <HomeSide />
    </div>
  </>
);

import type { ReactNode } from "react";

import { Guarded } from "./guarded";
import { HomeMain } from "./home-main";
import { HomeSide } from "./home-side";
import { HomeStats } from "./home-stats";

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

import type { ReactNode } from "react";

import { ActivityCard } from "./activity-card";
import { Guarded } from "./guarded";

export const HomeMain = (): ReactNode => (
  <div className="min-w-0 xl:col-span-2">
    <Guarded>
      <ActivityCard />
    </Guarded>
  </div>
);

import type { ReactNode } from "react";

import { ActivityCard } from "./activity-card.tsx";
import { Guarded } from "./guarded.tsx";

export const HomeMain = (): ReactNode => (
  <div className="min-w-0 xl:col-span-2">
    <Guarded>
      <ActivityCard />
    </Guarded>
  </div>
);

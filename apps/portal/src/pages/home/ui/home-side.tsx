import type { ReactNode } from "react";

import { AttentionCard } from "./attention-card";
import { Guarded } from "./guarded";
import { MoneyMiniCard } from "./money-mini-card";
import { ProjectsCard } from "./projects-card";

export const HomeSide = (): ReactNode => (
  <div className="flex min-w-0 flex-col gap-5">
    <Guarded>
      <AttentionCard />
    </Guarded>
    <Guarded>
      <MoneyMiniCard />
    </Guarded>
    <Guarded>
      <ProjectsCard />
    </Guarded>
  </div>
);

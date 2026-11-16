import type { ReactNode } from "react";

import { AttentionCard } from "./attention-card.tsx";
import { Guarded } from "./guarded.tsx";
import { MoneyMiniCard } from "./money-mini-card.tsx";
import { ProjectsCard } from "./projects-card.tsx";

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

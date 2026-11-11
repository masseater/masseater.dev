import type { ReactNode } from "react";

import { NudgeLine } from "./nudge-line.tsx";
import { Ring } from "./ring.tsx";

const OpeningStage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center gap-10 pt-16">
    <Ring size="lg" />
    <NudgeLine />
  </div>
);

export { OpeningStage };

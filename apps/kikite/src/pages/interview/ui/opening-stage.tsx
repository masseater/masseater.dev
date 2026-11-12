import type { ReactNode } from "react";

import { MicButton } from "./mic-button.tsx";
import { NudgeLine } from "./nudge-line.tsx";
import { Said } from "./said.tsx";

const OpeningStage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8 pt-16">
    <MicButton size="lg" />
    <NudgeLine />
    <Said align="center" />
  </div>
);

export { OpeningStage };

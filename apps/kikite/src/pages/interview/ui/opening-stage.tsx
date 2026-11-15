import type { ReactNode } from "react";

import { CurrentAnswer } from "./current-answer.tsx";
import { MicButton } from "./mic-button.tsx";
import { NudgeLine } from "./nudge-line.tsx";

export const OpeningStage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8">
    <MicButton size="lg" />
    <NudgeLine />
    <CurrentAnswer />
  </div>
);

import type { ReactNode } from "react";

import { MicButton } from "#/features/voice-input";

import { NudgeLine } from "./nudge-line.tsx";

const OpeningStage = (): ReactNode => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8">
    <MicButton size="lg" />
    <NudgeLine />
  </div>
);

export { OpeningStage };

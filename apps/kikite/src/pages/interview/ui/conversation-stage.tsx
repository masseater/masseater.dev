import type { ReactNode } from "react";

import { useAsked } from "#/entities/interview/index.ts";

import { AskedStage } from "./asked-stage.tsx";
import { OpeningStage } from "./opening-stage.tsx";

export const ConversationStage = (): ReactNode => {
  if (useAsked()) {
    return <AskedStage />;
  }
  return <OpeningStage />;
};

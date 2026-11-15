import type { ReactNode } from "react";

import { useAsked } from "#/entities/interview";

import { AskedStage } from "./asked-stage.tsx";
import { OpeningStage } from "./opening-stage.tsx";

const ConversationStage = (): ReactNode => {
  if (useAsked()) {
    return <AskedStage />;
  }
  return <OpeningStage />;
};

export { ConversationStage };

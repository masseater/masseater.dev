import type { ReactNode } from "react";

import { History } from "./history.tsx";
import { QuestionStage } from "./question-stage.tsx";
import { Said } from "./said.tsx";

const AskedStage = (): ReactNode => (
  <>
    <History />
    <QuestionStage />
    <Said align="start" />
  </>
);

export { AskedStage };

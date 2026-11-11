import type { ReactNode } from "react";

import { ModelField } from "./model-field.tsx";
import { SilenceField } from "./silence-field.tsx";
import { SpeakField } from "./speak-field.tsx";
import { StrategyField } from "./strategy-field.tsx";
import { SummaryField } from "./summary-field.tsx";

const SettingsFields = (): ReactNode => (
  <div className="flex flex-col gap-3">
    <StrategyField />
    <ModelField />
    <SilenceField />
    <SummaryField />
    <SpeakField />
  </div>
);

export { SettingsFields };

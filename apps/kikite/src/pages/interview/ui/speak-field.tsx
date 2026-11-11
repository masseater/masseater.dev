import type { ReactNode } from "react";

import { SettingRow } from "./setting-row.tsx";
import { SpeakChip } from "./speak-chip.tsx";

const LABEL = "読み上げ";

const SpeakField = (): ReactNode => (
  <SettingRow label={LABEL}>
    <SpeakChip speak />
    <SpeakChip speak={false} />
  </SettingRow>
);

export { SpeakField };

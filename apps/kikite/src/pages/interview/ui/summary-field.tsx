import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SettingRow } from "./setting-row.tsx";
import { SummaryChip } from "./summary-chip.tsx";

const LABEL = "要約";
const OFTEN = 10;
const NORMAL = 20;
const SELDOM = 40;
const MINUTE = 60;
const STEPS = [OFTEN, NORMAL, SELDOM, MINUTE] as const;

const SummaryField = (): ReactNode => (
  <SettingRow label={LABEL}>
    {pipe(
      STEPS,
      Arr.map((seconds) => <SummaryChip key={seconds} seconds={seconds} />),
    )}
  </SettingRow>
);

export { SummaryField };

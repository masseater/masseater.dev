import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SettingRow } from "./setting-row.tsx";
import { SilenceChip } from "./silence-chip.tsx";

const LABEL = "黙ったら";
const MANUAL = 0;
const QUICK = 1.5;
const NORMAL = 2.5;
const SLOW = 4;
const PATIENT = 6;
const STEPS = [MANUAL, QUICK, NORMAL, SLOW, PATIENT] as const;

const SilenceField = (): ReactNode => (
  <SettingRow label={LABEL}>
    {pipe(
      STEPS,
      Arr.map((seconds) => <SilenceChip key={seconds} seconds={seconds} />),
    )}
  </SettingRow>
);

export { SilenceField };

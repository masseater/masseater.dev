import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { STRATEGY_IDS } from "#strategies";

import { CompareChip } from "./compare-chip.tsx";
import { SettingRow } from "./setting-row.tsx";
import { StrategyChip } from "./strategy-chip.tsx";

const LABEL = "聞き方";

const StrategyField = (): ReactNode => (
  <SettingRow label={LABEL}>
    {pipe(
      STRATEGY_IDS,
      Arr.map((id) => <StrategyChip key={id} id={id} />),
    )}
    <CompareChip />
  </SettingRow>
);

export { StrategyField };

import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { MODEL_IDS } from "#strategies";

import { ModelChip } from "./model-chip.tsx";
import { SettingRow } from "./setting-row.tsx";

const LABEL = "モデル";

const ModelField = (): ReactNode => (
  <SettingRow label={LABEL}>
    {pipe(
      MODEL_IDS,
      Arr.map((id) => <ModelChip key={id} id={id} />),
    )}
  </SettingRow>
);

export { ModelField };

import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { BACH, useChange, withBaseline } from "#/entities/library/index.ts";
import type { Style } from "#/entities/library/index.ts";
import { baselineName } from "#/features/choose-baseline/model/baseline.ts";
import { LABELS } from "#/shared/config/index.ts";

export const BaselineSelect = ({
  current: style,
  baselines,
}: Readonly<{ current: Style; baselines: readonly string[] }>): ReactNode => {
  const change = useChange();
  const choose = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      change(withBaseline({ style: style.id, baseline: event.currentTarget.value }));
    },
    [change, style.id],
  );
  return (
    <label className="text-muted-foreground flex items-center gap-2 text-sm">
      {LABELS.baseline}
      <select
        value={style.baseline}
        className="border-input bg-background text-foreground h-8 rounded-md border px-2"
        onChange={choose}
      >
        {pipe(
          Arr.prepend(baselines, BACH),
          Arr.map((name) => (
            <option key={name} value={name}>
              {baselineName(name)}
            </option>
          )),
        )}
      </select>
    </label>
  );
};

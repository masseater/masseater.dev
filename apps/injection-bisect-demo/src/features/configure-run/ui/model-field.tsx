import { cn } from "@masseater.dev/web-ui";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useModel, useSetModel, MODELS } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";
import { SELECT_CLASS } from "#/shared/ui/select-class.ts";

export const ModelField = (): ReactNode => {
  const model = useModel();
  const setModel = useSetModel();
  const pick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setModel(event.target.value);
    },
    [setModel],
  );
  return (
    <select
      aria-label={COPY.model}
      value={model}
      onChange={pick}
      className={cn(SELECT_CLASS, "font-mono")}
    >
      {pipe(
        MODELS,
        Arr.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        )),
      )}
    </select>
  );
};

import { useAtomSet } from "@effect/atom-react";
import type { ModelInfo } from "@masseater.dev/yogoto-protocol";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { chosenModelAtom } from "#/features/separate-song/model/separate.ts";
import { LABELS } from "#/shared/config/index.ts";

export const ModelSelect = ({
  models,
  model,
}: Readonly<{ models: readonly ModelInfo[]; model: string }>): ReactNode => {
  const choose = useAtomSet(chosenModelAtom);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      choose(Option.some(event.currentTarget.value));
    },
    [choose],
  );
  return (
    <select
      value={model}
      onChange={handleChange}
      aria-label={LABELS.model}
      className="bg-background rounded-md border px-2 py-1.5 text-sm"
    >
      {pipe(
        models,
        Arr.map((info) => (
          <option key={info.id} value={info.id}>
            {info.label}
          </option>
        )),
      )}
    </select>
  );
};

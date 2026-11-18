import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { ModelInfo } from "@masseater.dev/yogoto-protocol";
import { Split } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { chosenModelAtom, modelOf, separateAtom } from "#/features/separate-song/model/separate.ts";
import { LABELS } from "#/shared/config/index.ts";

import { ModelSelect } from "./model-select.tsx";

export const SeparateMenu = ({
  songId,
  models,
}: Readonly<{ songId: string; models: readonly ModelInfo[] }>): ReactNode => {
  const chosen = useAtomValue(chosenModelAtom);
  const model = modelOf(models)(chosen);
  const separate = useAtomSet(separateAtom);
  const handleClick = useCallback(() => {
    separate({ songId, model });
  }, [separate, songId, model]);
  return (
    <div className="flex items-center gap-2">
      <ModelSelect models={models} model={model} />
      <button
        type="button"
        onClick={handleClick}
        disabled={model === ""}
        className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm"
      >
        <Split className="size-4" aria-hidden />
        {LABELS.separate}
      </button>
    </div>
  );
};

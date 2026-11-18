import type { ModelInfo } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { AnalyzeButton } from "#/features/analyze-song/index.ts";
import { SeparateMenu } from "#/features/separate-song/index.ts";

export const SongActions = ({
  songId,
  models,
}: Readonly<{ songId: string; models: readonly ModelInfo[] }>): ReactNode => (
  <div className="flex items-center gap-2">
    <AnalyzeButton songId={songId} />
    <SeparateMenu songId={songId} models={models} />
  </div>
);

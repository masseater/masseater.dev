import { useAtomSet } from "@effect/atom-react";
import { AudioLines } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { analyzeAtom } from "#/features/analyze-song/model/analyze.ts";
import { LABELS } from "#/shared/config/index.ts";

export const AnalyzeButton = ({ songId }: Readonly<{ songId: string }>): ReactNode => {
  const analyze = useAtomSet(analyzeAtom);
  const handleClick = useCallback(() => {
    analyze(songId);
  }, [analyze, songId]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm"
    >
      <AudioLines className="size-4" aria-hidden />
      {LABELS.analyze}
    </button>
  );
};
